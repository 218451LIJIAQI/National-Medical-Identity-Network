import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload, UserRole } from '../types';
import { CONFIG } from '../config';
import { getUserById } from '../database/central-multi';
import { getHospitalDb } from '../database/hospital-multi';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      rawToken?: string;
    }
  }
}

const revokedTokens = new Map<string, number>();
const DEFAULT_REVOCATION_TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) {
      revokedTokens.delete(key);
    }
  }
}, 300_000).unref();

function revokeToken(tokenOrJti?: string, expSeconds?: number): void {
  if (!tokenOrJti) return;
  const expiresAt = expSeconds ? expSeconds * 1000 : Date.now() + DEFAULT_REVOCATION_TTL_MS;
  revokedTokens.set(tokenOrJti, expiresAt);
}

export function revokeRequestSession(rawToken?: string, user?: Pick<JwtPayload, 'jti' | 'exp'>): void {
  if (rawToken) revokeToken(rawToken, user?.exp);
  if (user?.jti) revokeToken(user.jti, user.exp);
}

function isTokenRevoked(token: string, jti?: string): boolean {
  const now = Date.now();
  const tokenExp = revokedTokens.get(token);
  if (tokenExp && tokenExp > now) return true;
  if (jti) {
    const jtiExp = revokedTokens.get(jti);
    if (jtiExp && jtiExp > now) return true;
  }
  return false;
}

export function clearRevokedTokensForTesting(): void {
  revokedTokens.clear();
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
    ...payload,
    jti: payload.jti || crypto.randomUUID(),
  };
  return jwt.sign(tokenPayload, CONFIG.jwt.secret, {
    expiresIn: CONFIG.jwt.expiresIn,
  } as jwt.SignOptions);
}

function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, CONFIG.jwt.secret) as JwtPayload;
    if (isTokenRevoked(token, decoded.jti)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
      return;
    }

    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) {
      res.status(401).json({
        success: false,
        error: 'No authentication token provided',
      });
      return;
    }

    const payload = verifyToken(rawToken);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid, expired, or revoked token',
      });
      return;
    }

    const user = await getUserById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account is inactive or not found',
      });
      return;
    }

    if (
      user.role !== payload.role ||
      user.icNumber !== payload.icNumber ||
      (user.hospitalId || undefined) !== (payload.hospitalId || undefined)
    ) {
      res.status(401).json({
        success: false,
        error: 'Session role or hospital affiliation mismatch. Please sign in again.',
      });
      return;
    }

    // Real-time clinician roster check: if the doctor's hospital roster is reachable and deactivated, revoke access immediately
    if (user.role === 'doctor' && user.hospitalId) {
      let doctorRosterActive = true;
      try {
        const doctor = await getHospitalDb(user.hospitalId).getDoctorByIc(user.icNumber);
        if (!doctor || !doctor.isActive) {
          doctorRosterActive = false;
        }
      } catch {
        // Allow central session to proceed if hospital DB is transiently unreachable
      }

      if (!doctorRosterActive) {
        res.status(403).json({
          success: false,
          licenseRevoked: true,
          error: 'Doctor clinical license is inactive at the assigned hospital',
        });
        return;
      }
    }

    const requiresHospitalStep = user.role === 'doctor' || user.role === 'hospital_admin';
    req.rawToken = rawToken;
    req.user = {
      userId: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalVerified: requiresHospitalStep ? Boolean(payload.hospitalVerified) : true,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireHospitalVerification(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const requiresStep = req.user.role === 'doctor' || req.user.role === 'hospital_admin';
  if (requiresStep && !req.user.hospitalVerified) {
    res.status(403).json({
      success: false,
      verificationRequired: true,
      error: 'Hospital secondary verification is required before accessing clinical or administrative resources',
    });
    return;
  }

  next();
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

export function authorizeHospital(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role === 'central_admin') {
    next();
    return;
  }

  const hospitalId = req.params.hospitalId || req.body.hospitalId;
  if (!req.user.hospitalId || req.user.hospitalId !== hospitalId) {
    res.status(403).json({
      success: false,
      error: 'Access denied to this hospital',
    });
    return;
  }

  next();
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + CONFIG.jwt.secret).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash || typeof password !== 'string') return false;
  const computed = Buffer.from(hashPassword(password), 'utf8');
  const expected = Buffer.from(hash, 'utf8');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

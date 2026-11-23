import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';
import { CONFIG, hashPassword, verifyPassword } from '../config';
import { getUserById } from '../database/central-db';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export { hashPassword, verifyPassword };

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, CONFIG.jwt.secret, {
    expiresIn: CONFIG.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, CONFIG.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No authentication token provided',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  try {
    const user = await getUserById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account is inactive or not found',
      });
      return;
    }

    req.user = {
      userId: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
    };
    next();
  } catch (error) {
    console.error('Authentication check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service unavailable',
    });
  }
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

  const hospitalId = req.params.hospitalId || req.body?.hospitalId;
  if (!hospitalId || req.user.hospitalId !== hospitalId) {
    res.status(403).json({
      success: false,
      error: 'Access denied to this hospital',
    });
    return;
  }

  next();
}

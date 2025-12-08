import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '../types';
import { CONFIG } from '../config';
import { getUserById } from '../database/central-multi';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, CONFIG.jwt.secret, {
    expiresIn: CONFIG.jwt.expiresIn as string,
  } as jwt.SignOptions);
}

function verifyToken(token: string): JwtPayload | null {
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
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
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
  
  req.user = payload;
  next();
}

export function authorize(...roles: string[]) {
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
  
  const hospitalId = req.params.hospitalId || req.body.hospitalId;
  
  if (req.user.role === 'central_admin') {
    next();
    return;
  }
  
  if (req.user.hospitalId !== hospitalId) {
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
  return hashPassword(password) === hash;
}

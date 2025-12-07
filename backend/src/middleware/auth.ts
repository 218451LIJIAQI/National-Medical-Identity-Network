import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '../types';
import { CONFIG } from '../config';
import { getUserById } from '../database/central';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Generate JWT token
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, CONFIG.jwt.secret, {
    expiresIn: CONFIG.jwt.expiresIn as string,
  } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, CONFIG.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
}

// Authentication middleware
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
  
  // Verify user still exists and is active
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

// Role-based authorization middleware
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

// Hospital-specific authorization
export function authorizeHospital(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }
  
  const hospitalId = req.params.hospitalId || req.body.hospitalId;
  
  // Central admins can access any hospital
  if (req.user.role === 'central_admin') {
    next();
    return;
  }
  
  // Check if user belongs to the requested hospital
  if (req.user.hospitalId !== hospitalId) {
    res.status(403).json({
      success: false,
      error: 'Access denied to this hospital',
    });
    return;
  }
  
  next();
}

// Simple password hashing (for demo - use bcrypt in production)
export function hashPassword(password: string): string {
  // Simple hash for demo purposes - use bcrypt in production!
  return crypto.createHash('sha256').update(password + CONFIG.jwt.secret).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

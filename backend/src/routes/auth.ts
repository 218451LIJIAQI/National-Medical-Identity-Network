import { Router, Request, Response } from 'express';
import {
  createAuditLog,
  getPatientIndex,
  getUserById,
  getUsersByIc,
  updateUserLastLogin,
} from '../database/central-db';
import { findPatientAcrossHospitals, getHospitalDb } from '../database/hospital-db';
import { authenticate, generateToken, verifyPassword } from '../middleware/auth';
import { findHospitalConfig } from '../config';
import { AuthenticatedUserProfile, User } from '../types';

const router = Router();

async function buildUserProfile(user: User): Promise<AuthenticatedUserProfile> {
  const base: AuthenticatedUserProfile = {
    id: user.id,
    icNumber: user.icNumber,
    role: user.role,
    hospitalId: user.hospitalId,
  };

  if (user.role === 'doctor' && user.hospitalId) {
    const doctor = await getHospitalDb(user.hospitalId).getDoctorByIc(user.icNumber);
    if (doctor) {
      return {
        ...base,
        doctorId: doctor.id,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        department: doctor.department,
      };
    }
  }

  if (user.role === 'hospital_admin') {
    const hospital = findHospitalConfig(user.hospitalId);
    return {
      ...base,
      fullName: hospital?.adminDisplayName || 'Hospital Administrator',
    };
  }

  if (user.role === 'central_admin') {
    return {
      ...base,
      fullName: 'Central Administrator',
    };
  }

  if (user.role === 'patient') {
    const patientIndex = await getPatientIndex(user.icNumber);
    if (patientIndex && patientIndex.hospitals.length > 0) {
      const patient = await findPatientAcrossHospitals(user.icNumber, patientIndex.hospitals);
      if (patient) {
        return {
          ...base,
          fullName: patient.fullName,
        };
      }
    }
  }

  return base;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { icNumber, password, role } = req.body ?? {};
    const normalizedIc = typeof icNumber === 'string' ? icNumber.trim() : '';

    if (!normalizedIc || typeof password !== 'string' || !password) {
      res.status(400).json({
        success: false,
        error: 'IC number and password are required',
      });
      return;
    }

    const candidates = await getUsersByIc(normalizedIc);
    const matchingUsers = candidates.filter(
      (candidate) => (!role || candidate.role === role) && verifyPassword(password, candidate.passwordHash)
    );

    if (matchingUsers.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // If an IC holds multiple active roles (e.g., a doctor who is also a patient)
    // and no role was explicitly chosen, return rich role options for client selection.
    if (!role && matchingUsers.length > 1) {
      res.json({
        success: true,
        data: {
          requiresRoleSelection: true,
          roles: matchingUsers.map((u) => ({
            role: u.role,
            hospitalId: u.hospitalId,
          })),
        },
      });
      return;
    }

    const user = matchingUsers[0];
    await updateUserLastLogin(user.id);

    const token = generateToken({
      userId: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
    });

    const userProfile = await buildUserProfile(user);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: user.id,
      actorType: user.role,
      actorHospitalId: user.hospitalId,
      details: `${userProfile.fullName || user.icNumber} logged in successfully`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({
      success: true,
      data: {
        token,
        user: userProfile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const userProfile = await buildUserProfile(user);
    res.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve current user',
    });
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'logout',
      actorId: req.user!.userId,
      actorType: req.user!.role,
      actorHospitalId: req.user!.hospitalId,
      details: `${req.user!.icNumber} logged out`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log out',
    });
  }
});

export default router;

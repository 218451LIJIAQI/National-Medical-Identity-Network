import { Router, Request, Response } from 'express';
import {
  getUsersByIc,
  getUserById,
  updateUserLastLogin,
  createAuditLog,
  getPatientIndex,
} from '../database/central-multi';
import { authenticate, authorize, generateToken, verifyPassword } from '../middleware/auth';
import { getHospitalDb, findPatientInHospitals } from '../database/hospital-multi';
import { getHospitalById, normalizeIcNumber } from '../config';
import { User, UserRole } from '../types';

const router = Router();

async function buildUserProfile(user: User, availableRoles: UserRole[]) {
  const userInfo: Record<string, unknown> = {
    id: user.id,
    icNumber: user.icNumber,
    role: user.role,
    hospitalId: user.hospitalId,
    availableRoles,
  };

  if (user.role === 'doctor' && user.hospitalId) {
    try {
      const doctor = await getHospitalDb(user.hospitalId).getDoctorByIc(user.icNumber);
      if (doctor) {
        Object.assign(userInfo, {
          doctorId: doctor.id,
          fullName: doctor.fullName,
          specialization: doctor.specialization,
          department: doctor.department,
        });
      }
    } catch (err) {
      console.warn('Failed to enrich doctor profile:', err);
    }
  } else if (user.role === 'hospital_admin' && user.hospitalId) {
    userInfo.fullName = getHospitalById(user.hospitalId)?.adminName || 'Hospital Administrator';
  } else if (user.role === 'central_admin') {
    userInfo.fullName = 'Central Administrator';
  } else if (user.role === 'patient') {
    try {
      const patientIndex = await getPatientIndex(user.icNumber);
      if (patientIndex && patientIndex.hospitals.length > 0) {
        const patient = await findPatientInHospitals(user.icNumber, patientIndex.hospitals);
        if (patient) {
          userInfo.fullName = patient.fullName;
        }
      }
    } catch (err) {
      console.warn('Failed to enrich patient profile:', err);
    }
  }

  return userInfo;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const rawIc = typeof req.body?.icNumber === 'string' ? req.body.icNumber : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const requestedRole = typeof req.body?.role === 'string' && req.body.role ? req.body.role : undefined;

    const icNumber = normalizeIcNumber(rawIc);

    if (!icNumber || !password) {
      res.status(400).json({
        success: false,
        error: 'IC number and password are required',
      });
      return;
    }

    const usersForIc = await getUsersByIc(icNumber);
    const matchingUsers = usersForIc.filter(u => verifyPassword(password, u.passwordHash));

    if (matchingUsers.length === 0) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    if (!requestedRole && matchingUsers.length > 1) {
      res.json({
        success: true,
        data: {
          requiresRoleSelection: true,
          icNumber,
          availableRoles: matchingUsers.map(u => u.role),
        },
      });
      return;
    }

    const user = requestedRole
      ? matchingUsers.find(u => u.role === requestedRole)
      : matchingUsers[0];

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials for selected role',
      });
      return;
    }

    await updateUserLastLogin(user.id);

    const token = generateToken({
      userId: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
    });

    const allRolesForIc = usersForIc.map(u => u.role);
    const userInfo = await buildUserProfile(user, allRolesForIc);

    const userName = (userInfo.fullName as string) || user.icNumber;
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: user.id,
      actorType: user.role,
      actorHospitalId: user.hospitalId,
      details: `${userName} logged in as ${user.role}`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({
      success: true,
      data: {
        token,
        user: userInfo,
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

router.post(
  '/verify-hospital',
  authenticate,
  authorize('doctor', 'hospital_admin'),
  async (req: Request, res: Response) => {
    try {
      const currentUser = req.user!;
      const method = req.body?.method === 'ic_card' ? 'ic_card' : 'credentials';

      if (!currentUser.hospitalId) {
        res.status(403).json({
          success: false,
          error: 'No hospital assigned to this account',
        });
        return;
      }

      const hospital = getHospitalById(currentUser.hospitalId);
      if (!hospital) {
        res.status(404).json({
          success: false,
          error: 'Assigned hospital not found',
        });
        return;
      }

      const dbUser = await getUserById(currentUser.userId);
      if (!dbUser || !dbUser.isActive) {
        res.status(401).json({
          success: false,
          error: 'Account inactive or not found',
        });
        return;
      }

      if (method === 'credentials') {
        const staffId = typeof req.body?.staffId === 'string' ? normalizeIcNumber(req.body.staffId) : '';
        const password = typeof req.body?.password === 'string' ? req.body.password : '';

        if (!staffId || !password) {
          res.status(400).json({
            success: false,
            error: 'Hospital staff ID and password are required',
          });
          return;
        }

        if (
          staffId.toLowerCase() !== dbUser.icNumber.toLowerCase() ||
          !verifyPassword(password, dbUser.passwordHash)
        ) {
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'login',
            actorId: dbUser.id,
            actorType: dbUser.role,
            actorHospitalId: dbUser.hospitalId,
            details: `Failed hospital verification attempt at ${hospital.shortName}`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });
          res.status(401).json({
            success: false,
            error: 'Invalid hospital staff ID or password',
          });
          return;
        }
      }

      if (dbUser.role === 'doctor') {
        const doctor = await getHospitalDb(currentUser.hospitalId).getDoctorByIc(dbUser.icNumber);
        if (!doctor || !doctor.isActive) {
          res.status(403).json({
            success: false,
            error: 'Doctor profile is not registered or active at this hospital',
          });
          return;
        }
      }

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'login',
        actorId: dbUser.id,
        actorType: dbUser.role,
        actorHospitalId: dbUser.hospitalId,
        details: `Verified hospital access for ${hospital.shortName} (${method === 'ic_card' ? 'IC Card' : 'Staff Credentials'})`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      res.json({
        success: true,
        data: {
          verified: true,
          hospitalId: hospital.id,
          hospitalName: hospital.name,
        },
      });
    } catch (error) {
      console.error('Hospital verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Hospital verification failed',
      });
    }
  }
);

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const dbUser = await getUserById(req.user!.userId);
    if (!dbUser) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const usersForIc = await getUsersByIc(dbUser.icNumber);
    const userInfo = await buildUserProfile(
      dbUser,
      usersForIc.map(u => u.role)
    );

    res.json({
      success: true,
      data: { user: userInfo },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user session',
    });
  }
});

router.post('/switch-role', authenticate, async (req: Request, res: Response) => {
  try {
    const targetRole = typeof req.body?.role === 'string' ? (req.body.role as UserRole) : undefined;
    if (!targetRole) {
      res.status(400).json({
        success: false,
        error: 'Target role is required',
      });
      return;
    }

    const usersForIc = await getUsersByIc(req.user!.icNumber);
    const targetUser = usersForIc.find(u => u.role === targetRole);
    if (!targetUser) {
      res.status(403).json({
        success: false,
        error: 'Role is not available for this identity',
      });
      return;
    }

    await updateUserLastLogin(targetUser.id);

    const token = generateToken({
      userId: targetUser.id,
      icNumber: targetUser.icNumber,
      role: targetUser.role,
      hospitalId: targetUser.hospitalId,
    });

    const userInfo = await buildUserProfile(
      targetUser,
      usersForIc.map(u => u.role)
    );

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: targetUser.id,
      actorType: targetUser.role,
      actorHospitalId: targetUser.hospitalId,
      details: `Switched active session role to ${targetUser.role}`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({
      success: true,
      data: {
        token,
        user: userInfo,
      },
    });
  } catch (error) {
    console.error('Switch role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch role',
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
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

export default router;

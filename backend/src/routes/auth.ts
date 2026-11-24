import { Router, Request, Response } from 'express';
import {
  getUsersByIc,
  getUserById,
  updateUserLastLogin,
  createAuditLog,
  getPatientIndex,
} from '../database/central-multi';
import {
  authenticate,
  authorize,
  generateToken,
  revokeRequestSession,
  verifyPassword,
} from '../middleware/auth';
import { getHospitalDb, findPatientInHospitals } from '../database/hospital-multi';
import { getHospitalById } from '../config';
import { User, UserRole, VALID_USER_ROLES, normalizeIcNumber } from '../types';

const router = Router();

interface UserProfileResponse {
  id: string;
  icNumber: string;
  role: UserRole;
  hospitalId?: string;
  availableRoles: UserRole[];
  hospitalVerified: boolean;
  doctorId?: string;
  fullName?: string;
  specialization?: string;
  department?: string;
  licenseNumber?: string;
}

async function buildUserResponse(
  user: User,
  availableRoles: UserRole[],
  hospitalVerified: boolean
): Promise<UserProfileResponse | null> {
  const userInfo: UserProfileResponse = {
    id: user.id,
    icNumber: user.icNumber,
    role: user.role,
    hospitalId: user.hospitalId,
    availableRoles,
    hospitalVerified,
  };

  if (user.role === 'doctor' && user.hospitalId) {
    const doctor = await getHospitalDb(user.hospitalId).getDoctorByIc(user.icNumber);
    if (!doctor || !doctor.isActive) {
      return null;
    }
    userInfo.doctorId = doctor.id;
    userInfo.fullName = doctor.fullName;
    userInfo.specialization = doctor.specialization;
    userInfo.department = doctor.department;
    userInfo.licenseNumber = doctor.licenseNumber;
  } else if (user.role === 'hospital_admin' && user.hospitalId) {
    userInfo.fullName = getHospitalById(user.hospitalId)?.adminName || 'Hospital Administrator';
  } else if (user.role === 'central_admin') {
    userInfo.fullName = 'Central Administrator';
  } else if (user.role === 'patient') {
    const patientIndex = await getPatientIndex(user.icNumber);
    if (patientIndex && patientIndex.hospitals.length > 0) {
      const patient = await findPatientInHospitals(user.icNumber, patientIndex.hospitals);
      if (patient) {
        userInfo.fullName = patient.fullName;
      }
    }
  }

  return userInfo;
}

async function resolveUserProfileOrRespond(
  res: Response,
  user: User,
  availableRoles: UserRole[],
  hospitalVerified: boolean,
  inactiveError: string
): Promise<UserProfileResponse | null> {
  const profile = await buildUserResponse(user, availableRoles, hospitalVerified);
  if (!profile) {
    res.status(403).json({
      success: false,
      licenseRevoked: true,
      error: inactiveError,
    });
    return null;
  }
  return profile;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { icNumber: rawIc, password, role } = req.body || {};

    if (!rawIc || !password) {
      res.status(400).json({
        success: false,
        error: 'IC number and password are required',
      });
      return;
    }

    if (role !== undefined && role !== '' && !VALID_USER_ROLES.includes(role as UserRole)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role specified',
      });
      return;
    }

    const icNumber = normalizeIcNumber(String(rawIc));
    const candidates = await getUsersByIc(icNumber);
    const matchingUsers = candidates.filter(u => verifyPassword(String(password), u.passwordHash));

    if (matchingUsers.length === 0) {
      try {
        await createAuditLog({
          timestamp: new Date().toISOString(),
          action: 'login',
          actorType: 'system',
          targetIcNumber: icNumber,
          details: `Failed login attempt for ${icNumber}`,
          ipAddress: req.ip || 'unknown',
          success: false,
        });
      } catch {
        // Do not mask auth failure if audit DB write fails
      }

      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    const availableRoles = Array.from(new Set(matchingUsers.map(u => u.role)));

    if (!role && matchingUsers.length > 1) {
      res.json({
        success: true,
        data: {
          requiresRoleSelection: true,
          icNumber: matchingUsers[0].icNumber,
          availableRoles,
        },
      });
      return;
    }

    const user = role ? matchingUsers.find(u => u.role === role) : matchingUsers[0];
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials for the requested role',
      });
      return;
    }

    const requiresHospitalStep = user.role === 'doctor' || user.role === 'hospital_admin';
    const hospitalVerified = !requiresHospitalStep;

    const userInfo = await resolveUserProfileOrRespond(
      res,
      user,
      availableRoles,
      hospitalVerified,
      'Doctor profile is inactive or not registered at the assigned hospital'
    );
    if (!userInfo) return;

    await updateUserLastLogin(user.id);

    const token = generateToken({
      userId: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
      hospitalVerified,
    });

    const userName = userInfo.fullName || user.icNumber;
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: user.id,
      actorType: user.role,
      actorHospitalId: user.hospitalId,
      details: requiresHospitalStep
        ? `${userName} authenticated (pending hospital verification)`
        : `${userName} logged in successfully`,
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
      if (!currentUser.hospitalId || !getHospitalById(currentUser.hospitalId)) {
        res.status(403).json({
          success: false,
          error: 'No valid hospital affiliation found for this account',
        });
        return;
      }

      const dbUser = await getUserById(currentUser.userId);
      if (!dbUser || !dbUser.isActive) {
        res.status(401).json({
          success: false,
          error: 'User account is inactive or not found',
        });
        return;
      }

      const { method = 'credentials', username, staffId, password, icNumber } = req.body || {};
      if (method !== 'credentials' && method !== 'ic_chip') {
        res.status(400).json({
          success: false,
          error: 'Invalid verification method; expected "credentials" or "ic_chip"',
        });
        return;
      }

      const hospitalName = getHospitalById(currentUser.hospitalId)?.name || currentUser.hospitalId;

      let doctorRecord = null;
      if (dbUser.role === 'doctor') {
        doctorRecord = await getHospitalDb(currentUser.hospitalId).getDoctorByIc(dbUser.icNumber);
        if (!doctorRecord || !doctorRecord.isActive) {
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'verify',
            actorId: dbUser.id,
            actorType: dbUser.role,
            actorHospitalId: currentUser.hospitalId,
            targetHospitalId: currentUser.hospitalId,
            details: `Hospital verification rejected: inactive or missing doctor profile at ${hospitalName}`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });
          res.status(403).json({
            success: false,
            licenseRevoked: true,
            error: 'Active clinician profile not found at this hospital',
          });
          return;
        }
      }

      if (method === 'ic_chip') {
        const rawChipIc = String(icNumber ?? '').trim();
        if (!rawChipIc) {
          res.status(400).json({
            success: false,
            error: 'Scanned MyKad IC number is required for chip verification',
          });
          return;
        }
        const scannedIc = normalizeIcNumber(rawChipIc);
        if (scannedIc !== normalizeIcNumber(dbUser.icNumber)) {
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'verify',
            actorId: dbUser.id,
            actorType: dbUser.role,
            actorHospitalId: currentUser.hospitalId,
            targetHospitalId: currentUser.hospitalId,
            details: `IC chip verification failed at ${hospitalName}: identity mismatch`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });
          res.status(401).json({
            success: false,
            error: 'Scanned MyKad IC does not match authenticated user identity',
          });
          return;
        }
      } else {
        const rawStaffId = String(username || staffId || '').trim();
        const providedId = normalizeIcNumber(rawStaffId);
        const providedPassword = String(password || '');

        if (!providedId || !providedPassword) {
          res.status(400).json({
            success: false,
            error: 'Hospital staff ID and password are required',
          });
          return;
        }

        const validStaffIdentifiers = new Set<string>([normalizeIcNumber(dbUser.icNumber)]);
        if (doctorRecord) {
          if (doctorRecord.licenseNumber) validStaffIdentifiers.add(doctorRecord.licenseNumber);
          validStaffIdentifiers.add(doctorRecord.id);
        }

        const idMatches = validStaffIdentifiers.has(providedId) || validStaffIdentifiers.has(rawStaffId);
        const pwdMatches = verifyPassword(providedPassword, dbUser.passwordHash);

        if (!idMatches || !pwdMatches) {
          await createAuditLog({
            timestamp: new Date().toISOString(),
            action: 'verify',
            actorId: dbUser.id,
            actorType: dbUser.role,
            actorHospitalId: currentUser.hospitalId,
            targetHospitalId: currentUser.hospitalId,
            details: `Hospital credential verification failed at ${hospitalName}`,
            ipAddress: req.ip || 'unknown',
            success: false,
          });
          res.status(401).json({
            success: false,
            error: 'Invalid hospital staff credentials',
          });
          return;
        }
      }

      const allSameIcUsers = await getUsersByIc(dbUser.icNumber);
      const availableRoles = Array.from(new Set(allSameIcUsers.map(u => u.role)));
      const userInfo = await resolveUserProfileOrRespond(
        res,
        dbUser,
        availableRoles,
        true,
        'Active clinician profile not found at this hospital'
      );
      if (!userInfo) return;

      revokeRequestSession(req.rawToken, currentUser);

      const verifiedToken = generateToken({
        userId: dbUser.id,
        icNumber: dbUser.icNumber,
        role: dbUser.role,
        hospitalId: dbUser.hospitalId,
        hospitalVerified: true,
      });

      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'verify',
        actorId: dbUser.id,
        actorType: dbUser.role,
        actorHospitalId: currentUser.hospitalId,
        targetHospitalId: currentUser.hospitalId,
        details: `Hospital secondary verification (${method}) completed for ${hospitalName}`,
        ipAddress: req.ip || 'unknown',
        success: true,
      });

      res.json({
        success: true,
        data: {
          token: verifiedToken,
          user: userInfo,
        },
      });
    } catch (error) {
      console.error('Hospital verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete hospital verification',
      });
    }
  }
);

router.post('/switch-role', authenticate, async (req: Request, res: Response) => {
  try {
    const { role } = req.body || {};
    const currentUser = req.user!;

    if (!role || typeof role !== 'string' || !VALID_USER_ROLES.includes(role as UserRole)) {
      res.status(400).json({
        success: false,
        error: 'Valid target role is required',
      });
      return;
    }

    const allUsers = await getUsersByIc(currentUser.icNumber);
    const targetUser = allUsers.find(u => u.role === role);

    if (!targetUser) {
      res.status(403).json({
        success: false,
        error: 'Requested role is not assigned to this MyKad identity',
      });
      return;
    }

    const availableRoles = Array.from(new Set(allUsers.map(u => u.role)));

    // Idempotent no-op when switching to the currently active role: preserve step-up hospitalVerified state
    if (targetUser.id === currentUser.userId && targetUser.role === currentUser.role) {
      const preservedVerified = Boolean(currentUser.hospitalVerified);
      const sameUserInfo = await resolveUserProfileOrRespond(
        res,
        targetUser,
        availableRoles,
        preservedVerified,
        'Doctor profile is inactive at the assigned hospital'
      );
      if (!sameUserInfo) return;

      res.json({
        success: true,
        data: {
          token: req.rawToken!,
          user: sameUserInfo,
        },
      });
      return;
    }

    const requiresHospitalStep = targetUser.role === 'doctor' || targetUser.role === 'hospital_admin';
    const hospitalVerified = !requiresHospitalStep;

    const userInfo = await resolveUserProfileOrRespond(
      res,
      targetUser,
      availableRoles,
      hospitalVerified,
      'Doctor profile is inactive at the assigned hospital'
    );
    if (!userInfo) return;

    revokeRequestSession(req.rawToken, currentUser);

    await updateUserLastLogin(targetUser.id);

    const newToken = generateToken({
      userId: targetUser.id,
      icNumber: targetUser.icNumber,
      role: targetUser.role,
      hospitalId: targetUser.hospitalId,
      hospitalVerified,
    });

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: targetUser.id,
      actorType: targetUser.role,
      actorHospitalId: targetUser.hospitalId,
      details: `Switched active session role from ${currentUser.role} to ${targetUser.role}`,
      ipAddress: req.ip || 'unknown',
      success: true,
    });

    res.json({
      success: true,
      data: {
        token: newToken,
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
    const currentUser = req.user!;
    revokeRequestSession(req.rawToken, currentUser);

    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'logout',
      actorId: currentUser.userId,
      actorType: currentUser.role,
      actorHospitalId: currentUser.hospitalId,
      details: `User ${currentUser.icNumber} (${currentUser.role}) logged out`,
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
      error: 'Failed to complete logout',
    });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const dbUser = await getUserById(currentUser.userId);
    if (!dbUser || !dbUser.isActive) {
      res.status(401).json({
        success: false,
        error: 'User account is inactive or not found',
      });
      return;
    }

    const allUsers = await getUsersByIc(dbUser.icNumber);
    const availableRoles = Array.from(new Set(allUsers.map(u => u.role)));
    const userInfo = await resolveUserProfileOrRespond(
      res,
      dbUser,
      availableRoles,
      Boolean(currentUser.hospitalVerified),
      'Doctor profile is inactive or not registered at the assigned hospital'
    );
    if (!userInfo) return;

    res.json({
      success: true,
      data: {
        user: userInfo,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session profile',
    });
  }
});

export default router;

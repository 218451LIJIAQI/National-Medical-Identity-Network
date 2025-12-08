import { Router, Request, Response } from 'express';
import { getUserByIc, updateUserLastLogin, createAuditLog, getPatientIndex } from '../database/central-multi';
import { generateToken, verifyPassword } from '../middleware/auth';
import { getHospitalDb } from '../database/hospital-multi';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { icNumber, password, role } = req.body;

    if (!icNumber || !password) {
      res.status(400).json({
        success: false,
        error: 'IC number and password are required',
      });
      return;
    }

    const user = await getUserByIc(icNumber, role || undefined);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
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

    let userInfo: Record<string, unknown> = {
      id: user.id,
      icNumber: user.icNumber,
      role: user.role,
      hospitalId: user.hospitalId,
    };

    if (user.role === 'doctor' && user.hospitalId) {
      const hospitalDb = getHospitalDb(user.hospitalId);
      const doctor = await hospitalDb.getDoctorByIc(user.icNumber);
      if (doctor) {
        userInfo = {
          ...userInfo,
          doctorId: doctor.id,
          fullName: doctor.fullName,
          specialization: doctor.specialization,
          department: doctor.department,
        };
      }
    } else if (user.role === 'hospital_admin' && user.hospitalId) {
      const hospitalNames: Record<string, string> = {
        'hospital-kl': 'Admin KL General',
        'hospital-penang': 'Admin Penang MC',
        'hospital-jb': 'Admin Johor Specialist',
        'hospital-kuching': 'Admin Sarawak General',
        'hospital-kk': 'Admin Queen Elizabeth',
      };
      userInfo = {
        ...userInfo,
        fullName: hospitalNames[user.hospitalId] || 'Hospital Administrator',
      };
    } else if (user.role === 'central_admin') {
      userInfo = {
        ...userInfo,
        fullName: 'Central Administrator',
      };
    } else if (user.role === 'patient') {
      const patientIndex = await getPatientIndex(user.icNumber);
      if (patientIndex && patientIndex.hospitals.length > 0) {
        for (const hospitalId of patientIndex.hospitals) {
          const hospitalDb = getHospitalDb(hospitalId);
          const patient = await hospitalDb.getPatient(user.icNumber);
          if (patient) {
            userInfo = {
              ...userInfo,
              fullName: patient.fullName,
            };
            break;
          }
        }
      }
    }

    const userName = (userInfo.fullName as string) || user.icNumber;
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: user.id,
      actorType: user.role,
      actorHospitalId: user.hospitalId,
      details: `${userName} logged in successfully`,
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

export default router;

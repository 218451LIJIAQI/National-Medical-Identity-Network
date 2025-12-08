import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getUserByIc, createUser, updateUserLastLogin, createAuditLog, getPatientIndex } from '../database/central-multi';
import { generateToken, hashPassword, verifyPassword, authenticate } from '../middleware/auth';
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
    
    await createAuditLog({
      timestamp: new Date().toISOString(),
      action: 'login',
      actorId: user.id,
      actorType: user.role,
      actorHospitalId: user.hospitalId,
      details: 'User logged in successfully',
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

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { icNumber, password, role, hospitalId, fullName, specialization, department } = req.body;
    
    if (!icNumber || !password || !role) {
      res.status(400).json({
        success: false,
        error: 'IC number, password, and role are required',
      });
      return;
    }
    
    const existingUser = await getUserByIc(icNumber, role);
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User with this IC number and role already exists',
      });
      return;
    }
    
    const userId = uuidv4();
    await createUser({
      id: userId,
      icNumber,
      role,
      hospitalId,
      passwordHash: hashPassword(password),
      isActive: true,
    });
    
    if (role === 'doctor' && hospitalId) {
      const hospitalDb = getHospitalDb(hospitalId);
      await hospitalDb.createDoctor({
        id: uuidv4(),
        icNumber,
        fullName: fullName || 'Dr. ' + icNumber,
        specialization: specialization || 'General Practice',
        licenseNumber: 'LIC-' + icNumber.slice(0, 6),
        hospitalId,
        department: department || 'General',
        phone: '',
        email: '',
        isActive: true,
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }
    
    const user = await getUserByIc(req.user.icNumber, req.user.role);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
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
            userInfo.fullName = patient.fullName;
            break;
          }
        }
      }
      if (!userInfo.fullName) {
        userInfo.fullName = 'Patient';
      }
    }
    
    res.json({
      success: true,
      data: userInfo,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user) {
      await createAuditLog({
        timestamp: new Date().toISOString(),
        action: 'logout',
        actorId: req.user.userId,
        actorType: req.user.role as 'doctor' | 'patient' | 'hospital_admin' | 'central_admin',
        actorHospitalId: req.user.hospitalId,
        details: 'User logged out',
        ipAddress: req.ip || 'unknown',
        success: true,
      });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;

import { Router, Response, NextFunction } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { authenticate } from '../middleware/authenticate';
import { requireMinimumRole } from '../permissions/guards';
import { UserRole } from '../constants/roles';
import { validate } from '../middleware/validate';
import { createEmployeeSchema, updateEmployeeSchema } from '../validators/employee.validators';
import { z } from 'zod';
import { AuthorizationError } from '../errors';
import { hierarchyService } from '../services/hierarchy.service';

const router = Router();

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid employee ID format'),
});

// Helper for dynamic ownership or hierarchy checks on GET /employees/:id
const authorizeEmployeeAccess = async (req: any, _res: Response, next: NextFunction) => {
  try {
    const actorId = req.user.id;
    const actorRole = req.user.role;
    const targetId = req.params.id;

    if (actorId === targetId) {
      return next();
    }

    if ([UserRole.HR, UserRole.Administrator, UserRole.SuperAdmin].includes(actorRole)) {
      return next();
    }

    if (actorRole === UserRole.Manager) {
      // Check if target is a subordinate in reports hierarchy
      const reports = await hierarchyService.getReportsTree(actorId);
      const isReport = reports.some((rep) => rep.id === targetId);
      if (isReport) {
        return next();
      }
    }

    throw new AuthorizationError('Access denied. You do not have permission to view this employee profile.');
  } catch (e) {
    next(e);
  }
};

// GET employee by ID (self, managers for reports, HR, Admin)
router.get(
  '/:id',
  authenticate,
  validate({ params: uuidParamSchema }),
  authorizeEmployeeAccess,
  employeeController.get
);

// POST create employee (HR/Admin only)
router.post(
  '/',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ body: createEmployeeSchema }),
  employeeController.create
);

// PATCH update employee (self updates own address/contacts, HR/Admin full update)
router.patch(
  '/:id',
  authenticate,
  validate({ params: uuidParamSchema, body: updateEmployeeSchema }),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user.id;
      const actorRole = req.user.role;
      const targetId = req.params.id;

      // Allow self to update their own address/emergency details, and block self from promoting role/status
      if (actorId === targetId) {
        // Prevent editing sensitive columns
        const { role, status, manager_id, department_id, office_id, job_title_id } = req.body;
        if (
          role !== undefined ||
          status !== undefined ||
          manager_id !== undefined ||
          department_id !== undefined ||
          office_id !== undefined ||
          job_title_id !== undefined
        ) {
          throw new AuthorizationError('You are not authorized to update your own corporate fields (role, department, status, etc.).');
        }
        return employeeController.update(req, res, next);
      }

      // HR and Admin can update everything
      if ([UserRole.HR, UserRole.Administrator, UserRole.SuperAdmin].includes(actorRole)) {
        return employeeController.update(req, res, next);
      }

      throw new AuthorizationError('You do not have permission to update this employee profile.');
    } catch (e) {
      next(e);
    }
  }
);

// POST deactivate (HR/Admin only)
router.post(
  '/:id/deactivate',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  employeeController.deactivate
);

// POST restore (HR/Admin only)
router.post(
  '/:id/restore',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  employeeController.restore
);

// DELETE terminate employee (HR/Admin only)
router.delete(
  '/:id',
  authenticate,
  requireMinimumRole(UserRole.HR),
  validate({ params: uuidParamSchema }),
  employeeController.terminate
);

export default router;

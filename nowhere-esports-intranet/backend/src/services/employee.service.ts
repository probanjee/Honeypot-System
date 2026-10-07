import { employeeRepository } from '../repositories/employee.repository';
import { auditService } from './audit.service';
import { notificationService } from './notification.service';
import { AuditAction } from '../types/audit';
import { NotFoundError, ValidationError } from '../errors';

export class EmployeeService {
  async createEmployee(actorId: string, input: any, req?: any): Promise<any> {
    const {
      id,
      email,
      first_name,
      last_name,
      role = 'employee',
      department_id,
      office_id,
      job_title_id,
      manager_id,
      hire_date = new Date().toISOString(),
      status = 'active',
      address,
      emergency_contact,
    } = input;

    if (!id || !email || !first_name || !last_name) {
      throw new ValidationError('Profile ID, email, first name, and last name are required');
    }

    // 1. Create or sync the profile
    const profile = await employeeRepository.createProfile(
      id,
      email,
      first_name,
      last_name,
      role,
      department_id,
      office_id,
      job_title_id
    );

    // 2. Create the employee record
    const employee = await employeeRepository.create({
      id,
      manager_id: manager_id || null,
      hire_date,
      status,
    });

    // 3. Address if provided
    if (address) {
      await employeeRepository.upsertAddress(id, address);
    }

    // 4. Emergency contact if provided
    if (emergency_contact) {
      await employeeRepository.upsertEmergencyContact(id, emergency_contact);
    }

    // 5. Log audit trail
    await auditService.log(AuditAction.EMPLOYEE_CREATED, {
      actorId,
      targetId: id,
      metadata: { employee_id: employee.employee_id, department_id, office_id },
      req,
    });

    // 6. Trigger automatic notification
    void notificationService.handleEvent('employee_created', id);

    return { ...employee, profiles: profile };
  }

  async getEmployee(id: string): Promise<any> {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Fetch address and emergency contact
    const address = await employeeRepository.getAddress(id);
    const emergencyContact = await employeeRepository.getEmergencyContact(id);

    return {
      ...employee,
      address: address || null,
      emergency_contact: emergencyContact || null,
    };
  }

  async updateEmployee(actorId: string, id: string, input: any, req?: any): Promise<any> {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    const {
      first_name,
      last_name,
      role,
      department_id,
      office_id,
      job_title_id,
      manager_id,
      status,
      address,
      emergency_contact,
    } = input;

    // 1. Update Profile fields
    const profileUpdates: any = {};
    if (first_name !== undefined) profileUpdates.first_name = first_name;
    if (last_name !== undefined) profileUpdates.last_name = last_name;
    if (role !== undefined) profileUpdates.role = role;
    if (department_id !== undefined) profileUpdates.department_id = department_id;
    if (office_id !== undefined) profileUpdates.office_id = office_id;
    if (job_title_id !== undefined) profileUpdates.job_title_id = job_title_id;

    let updatedProfile = employee.profiles;
    if (Object.keys(profileUpdates).length > 0) {
      updatedProfile = await employeeRepository.updateProfile(id, profileUpdates);
      
      // Check for transfers to log separately
      if (department_id !== undefined && department_id !== employee.profiles.department_id) {
        await auditService.log(AuditAction.DEPARTMENT_TRANSFER, {
          actorId,
          targetId: id,
          metadata: { from_dept: employee.profiles.department_id, to_dept: department_id },
          req,
        });
        void notificationService.handleEvent('department_changed', id, { department_name: 'new department' });
      }
      if (office_id !== undefined && office_id !== employee.profiles.office_id) {
        await auditService.log(AuditAction.OFFICE_TRANSFER, {
          actorId,
          targetId: id,
          metadata: { from_office: employee.profiles.office_id, to_office: office_id },
          req,
        });
        void notificationService.handleEvent('profile_updated', id);
      }
      if (role !== undefined && role !== employee.profiles.role) {
        await auditService.log(AuditAction.ROLE_CHANGED, {
          actorId,
          targetId: id,
          metadata: { from_role: employee.profiles.role, to_role: role },
          req,
        });
        void notificationService.handleEvent('role_updated', id, { role });
      }
      if (first_name !== undefined || last_name !== undefined) {
        void notificationService.handleEvent('profile_updated', id);
      }
    }

    // 2. Update Employee fields
    const employeeUpdates: any = {};
    if (manager_id !== undefined) employeeUpdates.manager_id = manager_id;
    if (status !== undefined) employeeUpdates.status = status;

    let updatedEmployee = employee;
    if (Object.keys(employeeUpdates).length > 0) {
      updatedEmployee = await employeeRepository.update(id, employeeUpdates);

      if (manager_id !== undefined && manager_id !== employee.manager_id) {
        await auditService.log(AuditAction.MANAGER_CHANGE, {
          actorId,
          targetId: id,
          metadata: { from_manager: employee.manager_id, to_manager: manager_id },
          req,
        });
      }
      if (status !== undefined && status !== employee.status) {
        await auditService.log(AuditAction.EMPLOYMENT_STATUS_CHANGE, {
          actorId,
          targetId: id,
          metadata: { from_status: employee.status, to_status: status },
          req,
        });
      }
    }

    // 3. Address
    if (address) {
      await employeeRepository.upsertAddress(id, address);
    }

    // 4. Emergency Contact
    if (emergency_contact) {
      await employeeRepository.upsertEmergencyContact(id, emergency_contact);
    }

    // 5. General Update Log
    await auditService.log(AuditAction.EMPLOYEE_UPDATED, {
      actorId,
      targetId: id,
      req,
    });

    return {
      ...updatedEmployee,
      profiles: updatedProfile,
    };
  }

  async deactivateEmployee(actorId: string, id: string, req?: any): Promise<void> {
    await this.updateEmployee(actorId, id, { status: 'on_leave' }, req);
  }

  async restoreEmployee(actorId: string, id: string, req?: any): Promise<void> {
    await this.updateEmployee(actorId, id, { status: 'active' }, req);
  }

  async terminateEmployee(actorId: string, id: string, req?: any): Promise<void> {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Terminated sets status and termination date, then soft deletes
    await employeeRepository.update(id, {
      status: 'terminated',
      termination_date: new Date().toISOString().split('T')[0],
    });

    await employeeRepository.softDelete(id);

    await auditService.log(AuditAction.EMPLOYMENT_STATUS_CHANGE, {
      actorId,
      targetId: id,
      metadata: { status: 'terminated' },
      req,
    });
  }
}

export const employeeService = new EmployeeService();

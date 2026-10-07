import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class EmployeeRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*, profiles(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, userId: id }, 'EmployeeRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findByEmployeeId(employeeId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*, profiles(*)')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, employeeId }, 'EmployeeRepository.findByEmployeeId failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async createProfile(id: string, email: string, firstName: string, lastName: string, role: string, departmentId?: string, officeId?: string, jobTitleId?: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        department_id: departmentId || null,
        office_id: officeId || null,
        job_title_id: jobTitleId || null,
      })
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, email }, 'EmployeeRepository.createProfile failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async updateProfile(id: string, input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input }, 'EmployeeRepository.updateProfile failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async create(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'EmployeeRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input }, 'EmployeeRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('employees')
      .update({ deleted_at: new Date().toISOString(), status: 'terminated' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'EmployeeRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }

  // Address
  async upsertAddress(empId: string, input: any): Promise<void> {
    const { error } = await supabaseAdmin
      .from('employee_addresses')
      .upsert({ emp_id: empId, ...input });

    if (error) {
      logger.error({ err: error, empId, input }, 'EmployeeRepository.upsertAddress failed');
      throw new DatabaseError(error.message);
    }
  }

  async getAddress(empId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('employee_addresses')
      .select('*')
      .eq('emp_id', empId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, empId }, 'EmployeeRepository.getAddress failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  // Emergency Contact
  async upsertEmergencyContact(empId: string, input: any): Promise<void> {
    const { error } = await supabaseAdmin
      .from('employee_emergency_contacts')
      .upsert({ emp_id: empId, ...input });

    if (error) {
      logger.error({ err: error, empId, input }, 'EmployeeRepository.upsertEmergencyContact failed');
      throw new DatabaseError(error.message);
    }
  }

  async getEmergencyContact(empId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('employee_emergency_contacts')
      .select('*')
      .eq('emp_id', empId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, empId }, 'EmployeeRepository.getEmergencyContact failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }
}

export const employeeRepository = new EmployeeRepository();

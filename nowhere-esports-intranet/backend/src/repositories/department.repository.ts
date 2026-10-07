import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class DepartmentRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'DepartmentRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      logger.error({ err: error }, 'DepartmentRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async create(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'DepartmentRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input }, 'DepartmentRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'DepartmentRepository.delete failed');
      throw new DatabaseError(error.message);
    }
  }

  async getStatistics(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('department_statistics_view')
      .select('*');

    if (error) {
      logger.error({ err: error }, 'DepartmentRepository.getStatistics failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }
}

export const departmentRepository = new DepartmentRepository();

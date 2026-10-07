import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class HierarchyRepository {
  async getManagerTree(empId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .rpc('get_manager_hierarchy', { emp_id: empId });

    if (error) {
      logger.error({ err: error, empId }, 'HierarchyRepository.getManagerTree failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async getReportsTree(empId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .rpc('get_reports_hierarchy', { emp_id: empId });

    if (error) {
      logger.error({ err: error, empId }, 'HierarchyRepository.getReportsTree failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }
}

export const hierarchyRepository = new HierarchyRepository();

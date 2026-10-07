import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class OfficeRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('offices')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'OfficeRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('offices')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      logger.error({ err: error }, 'OfficeRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async create(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('offices')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'OfficeRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('offices')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input }, 'OfficeRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('offices')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'OfficeRepository.delete failed');
      throw new DatabaseError(error.message);
    }
  }
}

export const officeRepository = new OfficeRepository();

import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

export class SupportRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*, ticket_comments(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'SupportRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async create(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'SupportRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async addComment(input: any): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('ticket_comments')
      .insert(input)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input }, 'SupportRepository.addComment failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }
}

export const supportRepository = new SupportRepository();

import { supabaseAdmin } from '../config/supabase';
import { DatabaseError } from '../errors';
import { logger } from '../utils/logger';

type ListOptions = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
};

function pageRange(page = 1, pageSize = 20): { from: number; to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeTeamInput(input: any): any {
  const teamName = input.team_name ?? input.name;
  const shortName = input.short_name ?? input.code;
  const output = { ...input };

  delete output.team_name;
  delete output.short_name;

  if (teamName !== undefined) {
    output.team_name = teamName;
    output.name = teamName;
  }
  if (shortName !== undefined) {
    output.short_name = shortName;
    output.code = String(shortName).toUpperCase();
  }
  if (input.slug !== undefined) {
    output.slug = input.slug;
  } else if (teamName !== undefined) {
    output.slug = slugify(teamName);
  }
  if (output.social_links === undefined) {
    output.social_links = {};
  }

  return output;
}

export class TeamRepository {
  async findById(id: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'TeamRepository.findById failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async findAll(options: ListOptions = {}): Promise<{ data: any[]; total: number }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const { from, to } = pageRange(page, pageSize);

    let query = supabaseAdmin
      .from('teams')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.q) {
      const q = options.q.replace(/[%(),]/g, '');
      query = query.or(`team_name.ilike.%${q}%,short_name.ilike.%${q}%,region.ilike.%${q}%`);
    }

    const { data, error, count } = await query
      .order('team_name', { ascending: true })
      .range(from, to);

    if (error) {
      logger.error({ err: error, options }, 'TeamRepository.findAll failed');
      throw new DatabaseError(error.message);
    }
    return { data: data ?? [], total: count ?? 0 };
  }

  async create(input: any): Promise<any> {
    const payload = normalizeTeamInput(input);
    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, input: payload }, 'TeamRepository.create failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async update(id: string, input: any): Promise<any> {
    const payload = normalizeTeamInput(input);
    const { data, error } = await supabaseAdmin
      .from('teams')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, id, input: payload }, 'TeamRepository.update failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async archive(id: string): Promise<any> {
    return this.update(id, { status: 'archived', archived_at: new Date().toISOString() });
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('teams')
      .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
      .eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'TeamRepository.softDelete failed');
      throw new DatabaseError(error.message);
    }
  }

  async assignManager(teamId: string, managerId: string): Promise<any> {
    return this.update(teamId, { manager_id: managerId });
  }

  async assignCoach(teamId: string, coachId: string): Promise<any> {
    return this.update(teamId, { coach_id: coachId });
  }

  async assignCaptain(teamId: string, captainId: string): Promise<any> {
    return this.update(teamId, { captain_id: captainId });
  }

  async addPlayer(teamId: string, playerId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('players')
      .update({ current_team: teamId, status: 'active' })
      .eq('id', playerId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, teamId, playerId }, 'TeamRepository.addPlayer failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async removePlayer(teamId: string, playerId: string): Promise<any> {
    const { data, error } = await supabaseAdmin
      .from('players')
      .update({ current_team: null, status: 'benched' })
      .eq('id', playerId)
      .eq('current_team', teamId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      logger.error({ err: error, teamId, playerId }, 'TeamRepository.removePlayer failed');
      throw new DatabaseError(error.message);
    }
    return data;
  }

  async getPlayers(teamId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('current_team', teamId)
      .is('deleted_at', null)
      .order('player_tag', { ascending: true });

    if (error) {
      logger.error({ err: error, teamId }, 'TeamRepository.getPlayers failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async findManagedTeamIds(managerId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('manager_id', managerId)
      .is('deleted_at', null);

    if (error) {
      logger.error({ err: error, managerId }, 'TeamRepository.findManagedTeamIds failed');
      throw new DatabaseError(error.message);
    }
    return (data ?? []).map((row: any) => row.id);
  }

  async addMember(teamId: string, empId: string, role: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('team_members')
      .upsert({ team_id: teamId, emp_id: empId, role });

    if (error) {
      logger.error({ err: error, teamId, empId, role }, 'TeamRepository.addMember failed');
      throw new DatabaseError(error.message);
    }
  }

  async removeMember(teamId: string, empId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('emp_id', empId);

    if (error) {
      logger.error({ err: error, teamId, empId }, 'TeamRepository.removeMember failed');
      throw new DatabaseError(error.message);
    }
  }

  async getMembers(teamId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*, employees(*, profiles(*))')
      .eq('team_id', teamId);

    if (error) {
      logger.error({ err: error, teamId }, 'TeamRepository.getMembers failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }

  async addManager(teamId: string, empId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('team_managers')
      .upsert({ team_id: teamId, emp_id: empId });

    if (error) {
      logger.error({ err: error, teamId, empId }, 'TeamRepository.addManager failed');
      throw new DatabaseError(error.message);
    }
  }

  async removeManager(teamId: string, empId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('team_managers')
      .delete()
      .eq('team_id', teamId)
      .eq('emp_id', empId);

    if (error) {
      logger.error({ err: error, teamId, empId }, 'TeamRepository.removeManager failed');
      throw new DatabaseError(error.message);
    }
  }

  async getManagers(teamId: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('team_managers')
      .select('*, employees(*, profiles(*))')
      .eq('team_id', teamId);

    if (error) {
      logger.error({ err: error, teamId }, 'TeamRepository.getManagers failed');
      throw new DatabaseError(error.message);
    }
    return data ?? [];
  }
}

export const teamRepository = new TeamRepository();

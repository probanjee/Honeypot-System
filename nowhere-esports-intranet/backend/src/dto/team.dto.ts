export interface CreateTeamDto {
  name: string;
  code: string;
  type?: 'esports' | 'corporate' | 'other';
  status?: 'active' | 'inactive';
}

export interface TeamResponseDto {
  id: string;
  name: string;
  code: string;
  type: 'esports' | 'corporate' | 'other';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface AddTeamMemberDto {
  team_id: string;
  emp_id: string;
  role: string;
}

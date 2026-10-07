export interface CreatePlayerDto {
  id: string;
  in_game_name: string;
  role: 'IGL' | 'Duelist' | 'Initiator' | 'Controller' | 'Sentinel' | 'Top' | 'Jungle' | 'Mid' | 'ADC' | 'Support' | 'Flex';
  mouse_sensitivity?: string | null;
  dpi?: number | null;
  keyboard?: string | null;
  mouse?: string | null;
  monitor?: string | null;
  headset?: string | null;
  status?: 'active' | 'bench' | 'inactive';
}

export interface PlayerResponseDto {
  id: string;
  in_game_name: string;
  role: string;
  mouse_sensitivity: string | null;
  dpi: number | null;
  keyboard: string | null;
  mouse: string | null;
  monitor: string | null;
  headset: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTournamentDto {
  name: string;
  game: string;
  organizer: string;
  prize_pool?: string | null;
  start_date: string;
  end_date?: string | null;
  status?: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

export interface TournamentResponseDto {
  id: string;
  name: string;
  game: string;
  organizer: string;
  prize_pool: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

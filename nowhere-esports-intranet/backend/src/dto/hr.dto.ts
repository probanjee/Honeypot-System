export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  days_allowed?: number;
  is_paid?: boolean;
}

export interface LeaveTypeResponseDto {
  id: string;
  name: string;
  code: string;
  days_allowed: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveRequestDto {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
}

export interface LeaveRequestResponseDto {
  id: string;
  emp_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

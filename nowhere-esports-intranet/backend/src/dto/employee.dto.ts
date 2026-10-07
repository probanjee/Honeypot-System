export interface CreateEmployeeDto {
  id: string;
  hire_date?: string;
  termination_date?: string | null;
  manager_id?: string | null;
  status?: 'active' | 'on_leave' | 'terminated';
}

export interface EmployeeResponseDto {
  id: string;
  employee_id: string;
  hire_date: string;
  termination_date: string | null;
  manager_id: string | null;
  status: 'active' | 'on_leave' | 'terminated';
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeContactDto {
  emp_id: string;
  type: 'personal_email' | 'work_email' | 'personal_phone' | 'work_phone' | 'discord' | 'slack';
  value: string;
  is_primary?: boolean;
}

export interface EmployeeContactResponseDto {
  id: string;
  emp_id: string;
  type: string;
  value: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

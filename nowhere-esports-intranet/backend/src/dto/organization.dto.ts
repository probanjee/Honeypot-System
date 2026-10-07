export interface CreateOrganizationDto {
  name: string;
  domain?: string;
}

export interface OrganizationResponseDto {
  id: string;
  name: string;
  domain: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOfficeDto {
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface OfficeResponseDto {
  id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentDto {
  org_id: string;
  name: string;
  code: string;
}

export interface DepartmentResponseDto {
  id: string;
  org_id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

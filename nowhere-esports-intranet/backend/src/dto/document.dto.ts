export interface CreateFolderDto {
  name: string;
  parent_id?: string | null;
}

export interface FolderResponseDto {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentDto {
  name: string;
  folder_id?: string | null;
  file_type: string;
  size_bytes?: number;
}

export interface DocumentResponseDto {
  id: string;
  name: string;
  folder_id: string | null;
  owner_id: string;
  file_type: string;
  size_bytes: number;
  current_version: number;
  created_at: string;
  updated_at: string;
}

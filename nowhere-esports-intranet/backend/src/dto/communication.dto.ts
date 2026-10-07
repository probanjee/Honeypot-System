export interface CreateAnnouncementDto {
  title: string;
  content: string;
  pinned?: boolean;
  status?: 'draft' | 'published';
  published_at?: string;
}

export interface AnnouncementResponseDto {
  id: string;
  author_id: string;
  title: string;
  content: string;
  pinned: boolean;
  status: 'draft' | 'published';
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationDto {
  title: string;
  content: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  action_url?: string | null;
}

export interface NotificationResponseDto {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  action_url: string | null;
  created_at: string;
}

export interface CreateTicketCategoryDto {
  name: string;
  code: string;
}

export interface TicketCategoryResponseDto {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface CreateSupportTicketDto {
  category_id: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SupportTicketResponseDto {
  id: string;
  category_id: string;
  creator_id: string;
  assignee_id: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface CreateTicketCommentDto {
  ticket_id: string;
  comment: string;
}

export interface TicketCommentResponseDto {
  id: string;
  ticket_id: string;
  author_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface CreateKbCategoryDto {
  name: string;
  code: string;
  description?: string | null;
  parent_id?: string | null;
}

export interface KbCategoryResponseDto {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface CreateKbArticleDto {
  category_id: string;
  title: string;
  slug: string;
  content: string;
  status?: 'draft' | 'published';
}

export interface KbArticleResponseDto {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published';
  view_count: number;
  created_at: string;
  updated_at: string;
}

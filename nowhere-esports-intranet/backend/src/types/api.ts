// ---------------------------------------------------------------------------
// Standard API response envelope types
// ---------------------------------------------------------------------------

/** Pagination metadata included in list responses */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Successful API response */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta | Record<string, unknown>;
}

/** Field-level validation error detail */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/** Error API response */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
  status: number;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

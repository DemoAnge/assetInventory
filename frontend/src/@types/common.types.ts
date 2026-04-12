export interface PaginatedResponseType<T> {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorType {
  detail?: string;
  [key: string]: string | string[] | undefined;
}

export interface SelectOptionType {
  value: string | number;
  label: string;
}

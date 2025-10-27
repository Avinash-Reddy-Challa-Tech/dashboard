// types.ts
export interface UserStoryData {
  artifact_id?: string;
  artifact_title?: string;
  artifact_title_ids?: string[];
  date?: string;
  time?: string;
  user_email?: string;
  mode_name?: string;
  widget_name?: string;
  project_name?: string;
  user_story_type?: string;
  status?: 'success' | 'failed' | 'pending';
  created_at?: string;
  updated_at?: string;
}

export interface TimeWindow {
  label: string;
  hours?: number;
  days?: number;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
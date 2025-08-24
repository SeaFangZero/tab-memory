// Core data model types - authoritative contract for all phases

export interface User {
  id: string;
  email: string;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  confidence: number;
  started_at: Date;
  last_active_at: Date;
  screenshot_url?: string;
  mode: 'strict' | 'loose';
}

export interface Tab {
  id: string;
  session_id: string;
  url: string;
  title: string;
  pinned: boolean;
  order_index: number;
  first_seen_at: Date;
  last_seen_at: Date;
}

export type EventType = 'open' | 'update' | 'activate' | 'close';

export interface Event {
  id: string;
  user_id: string;
  window_id: number;
  tab_id: number;
  type: EventType;
  title: string;
  url: string;
  ts: Date;
}

export type VectorOwnerType = 'session' | 'tab' | 'query';

export interface Vector {
  id: string;
  owner_type: VectorOwnerType;
  owner_id: string;
  embedding: number[];
  dim: number;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication types
export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

// Search types (for future phases)
export interface SearchQuery {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    date_range?: {
      start: Date;
      end: Date;
    };
    session_ids?: string[];
  };
}

export interface SearchResult {
  type: 'session' | 'tab';
  id: string;
  title: string;
  summary?: string;
  url?: string;
  similarity_score: number;
  last_active_at: Date;
  session?: Session;
  tab?: Tab;
}

// Configuration types
export interface ExtensionConfig {
  api_base_url: string;
  enable_screenshots: boolean;
  clustering_threshold: number;
  max_sessions_per_user: number;
  session_timeout_minutes: number;
}

// Clustering scoring (for Phase 3+)
export interface ClusteringScore {
  semantic_shift_below_0_6: number;
  majority_shift_over_50pct: number;
  idle_gap_over_20m: number;
  new_window_boundary: number;
  persistence_over_2_snapshots_or_3_tabs: number;
  total: number;
}

export const DEFAULT_CLUSTERING_WEIGHTS = {
  semantic_shift_below_0_6: 3,
  majority_shift_over_50pct: 2,
  idle_gap_over_20m: 1,
  new_window_boundary: 3,
  persistence_over_2_snapshots_or_3_tabs: 2,
} as const;

export const PROMOTION_THRESHOLD = 5;

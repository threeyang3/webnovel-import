import type { Provider } from './sources';
export type { Provider } from './sources';

export interface BookRef {
  provider: Provider;
  id: string;
  url: string;
}

export type Acquisition = 'remote' | 'html' | 'browser' | 'manual';

export interface SourceMetadata extends BookRef {
  title: string;
  authors: string[];
  description?: string;
  cover_url?: string;
  tags?: string[];
  serialization_status?: 'ongoing' | 'completed' | 'paused' | 'unknown';
  word_count_text?: string;
  first_published_at?: string;
  first_published_year?: number;
  last_updated_at?: string;
  latest_chapter?: string;
  fetched_at: string;
  /** Source fields retained from older responses, mapped to their last observed time. */
  retained_fields?: Record<string, string>;
  /** Provenance known for values retained by this writer; absent on older files. */
  retained_field_acquisitions?: Record<string, Acquisition>;
  acquisition: Acquisition;
  evidence: Record<string, string>;
  warnings: string[];
}

export interface ImportSettings {
  outputFolder: string;
  coverFolder: string;
  downloadCovers: boolean;
  summaryLength: number;
}

export const DEFAULT_SETTINGS: ImportSettings = {
  outputFolder: '网文',
  coverFolder: '_assets/webnovel-import',
  downloadCovers: true,
  summaryLength: 260,
};

export const sourceKey = (ref: BookRef): string => `${ref.provider}:${ref.id}`;

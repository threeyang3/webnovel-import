export type Provider = 'qidian' | 'fanqie';

export interface BookRef {
  provider: Provider;
  id: string;
  url: string;
}

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
  acquisition: 'remote' | 'html' | 'browser' | 'manual';
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

export const providerName = (provider: Provider): string => provider === 'qidian' ? '起点中文网' : '番茄小说';
export const sourceKey = (ref: BookRef): string => `${ref.provider}:${ref.id}`;

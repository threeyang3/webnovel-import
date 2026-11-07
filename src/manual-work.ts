import type { SourceMetadata } from './types';

/** Local Work fields. Reference details are personal provenance, not a platform identity. */
export interface ManualWorkDraft {
  title: string;
  authors?: string[];
  cover?: string;
  summary?: string;
  first_published_at?: string;
  first_published_year?: number;
  serialization_status?: SourceMetadata['serialization_status'];
  word_count_text?: string;
  tags?: string[];
  reference?: { platform?: string; url?: string; note?: string };
}

const trimmed = (value?: string): string | undefined => value?.trim() || undefined;

function list(values?: string[]): string[] | undefined {
  const result = [...new Set(values?.map(value => value.trim()).filter(Boolean))];
  return result.length ? result : undefined;
}

export function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function normalizeManualWork(draft: ManualWorkDraft): ManualWorkDraft {
  const title = draft.title.trim();
  if (!title) throw new Error('请填写作品书名。');
  const authors = list(draft.authors);
  const cover = trimmed(draft.cover);
  const summary = trimmed(draft.summary);
  const wordCount = trimmed(draft.word_count_text);
  const tags = list(draft.tags);
  const date = trimmed(draft.first_published_at);
  let year = draft.first_published_year;
  if (date) {
    const day = new Date(`${date}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
      throw new Error('首发日期请填写有效的 YYYY-MM-DD。');
    }
    if (year !== undefined && year !== day.getUTCFullYear()) throw new Error('首发年份与日期不一致。');
    year = day.getUTCFullYear();
  }
  if (year !== undefined && (!Number.isInteger(year) || year < 1 || year > 9999)) throw new Error('首发年份请填四位数字。');
  const status = draft.serialization_status;
  if (status && !['ongoing', 'completed', 'paused', 'unknown'].includes(status)) throw new Error('请选择作品状态。');
  const platform = trimmed(draft.reference?.platform);
  const url = trimmed(draft.reference?.url);
  const note = trimmed(draft.reference?.note);
  if (url && !isHttpUrl(url)) throw new Error('历史链接请填写完整的 HTTP 或 HTTPS 地址。');

  return {
    title, ...(authors && { authors }), ...(cover && { cover: isHttpUrl(cover) ? new URL(cover).href : cover }), ...(summary && { summary }),
    ...(date && { first_published_at: date }), ...(year !== undefined && { first_published_year: year }),
    ...(status && status !== 'unknown' && { serialization_status: status }), ...(wordCount && { word_count_text: wordCount }),
    ...(tags && { tags }),
    ...((platform || url || note) && { reference: { ...(platform && { platform }), ...(url && { url }), ...(note && { note }) } }),
  };
}

export function manualFrontmatter(draft: ManualWorkDraft, uid: string): Record<string, unknown> {
  const { reference, ...fields } = draft;
  // A baseline for provided fields also protects a subsequent manual clearing.
  const adopted = Object.fromEntries(Object.entries(fields).map(([field, value]) => [
    field, { source_key: 'manual:local', value: structuredClone(value), evidence: 'manual:用户手工建档' },
  ]));
  return {
    uid, type: 'work', media: 'webnovel', ...fields,
    webnovel_import: {
      schema_version: 1, sources: [], adopted, ...(reference && { manual_reference: reference }),
    },
  };
}

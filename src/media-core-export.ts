import {
  normalizeDisplayTime, normalizeExternalUrl, normalizePartialDate, normalizeSourceV2, normalizeTimestamp, SOURCE_V2_PROTOCOL,
} from '../vendor/media-source-v2.cjs';
import { parseBookUrl } from './sources';
import type { SourceMetadata } from './types';

const mappedFields = {
  title: 'title', authors: 'authors', description: 'summary', cover_url: 'cover', tags: 'tags',
  serialization_status: 'original_status', first_published_year: 'year',
  first_published_at: 'release_date', last_updated_at: 'latest_chapter_updated_at',
} as const;
type LegacyField = keyof typeof mappedFields;

interface FieldEvidence {
  state: 'observed' | 'retained' | 'unverified';
  basis: 'source-observation' | 'manual-entry' | 'local-document-read';
  observed_at?: string;
  locator?: string;
}

function optionalValue(value: unknown, normalize: (input: unknown) => string): string | undefined {
  try { return normalize(value); }
  catch { return undefined; }
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '')
    && (!Array.isArray(value) || value.some(entry => typeof entry === 'string' && entry.trim()));
}

function chapterUpdate(source: SourceMetadata, locator: string): string | undefined {
  if (!source.latest_chapter || !source.last_updated_at) return undefined;
  // A date next to the latest chapter is distinct from a generic book update date.
  // Old exports without this locator keep the platform text for review.
  const chapterLocator = (source.provider === 'qidian'
    && (locator.includes('.update-time') || locator.includes('og:novel:update_time')))
    || (source.provider === 'fanqie' && locator.includes('.info-last-time'))
    || (source.provider === 'qimao' && locator.includes('.book-information .update-info .update-time'))
    || (source.provider === 'jjwxc' && locator.includes('tr[itemprop~="newestChapter"]') && locator.includes('可见更新时间'));
  if (!chapterLocator) return undefined;
  return optionalValue(source.last_updated_at.replace(/^(\d{4}-\d\d-\d\d)\s+(?=\d\d:)/, '$1T'), normalizeDisplayTime);
}

/** Convert already acquired metadata. No requests, Vault access, or writes. */
export function toMediaCoreSource(
  source: SourceMetadata, { archive = false, now = () => new Date().toISOString() } = {},
): Record<string, unknown> {
  const ref = parseBookUrl(source.url);
  if (ref.id !== source.id || ref.provider !== source.provider) {
    throw new Error('来源的作品链接与 ID 不一致，无法导出。');
  }
  const locators = Object.fromEntries(Object.entries(source.evidence ?? {}).filter(([, value]) => typeof value === 'string'));
  const acquisition = ['remote', 'html', 'browser', 'manual'].includes(source.acquisition) ? source.acquisition : undefined;
  const currentTime = optionalValue(source.fetched_at, normalizeTimestamp);
  const manual = !archive && (acquisition === 'manual'
    || Object.values(locators).some(locator => locator.startsWith('manual:')));
  const method = manual ? 'manual' : archive || !currentTime || !acquisition ? 'archive' : acquisition;
  const acquired_at = method === 'archive' || manual ? normalizeTimestamp(now()) : currentTime;
  const warnings = Array.isArray(source.warnings) ? source.warnings.filter(value => typeof value === 'string') : [];
  const fields: Record<string, unknown> = {};
  const field_evidence: Record<string, FieldEvidence> = {};
  const original: Record<string, unknown> = {};

  const evidence = (key: LegacyField): FieldEvidence => {
    const locator = locators[key];
    const isManual = acquisition === 'manual' || locator?.startsWith('manual:');
    const retainedAt = source.retained_fields?.[key];
    const priorAcquisition = source.retained_field_acquisitions?.[key];
    if (retainedAt !== undefined && (archive || !locator?.startsWith('manual:'))) {
      const basis = priorAcquisition === 'remote' || priorAcquisition === 'browser' ? 'source-observation'
        : priorAcquisition === 'manual' ? 'manual-entry' : 'local-document-read';
      const observed_at = basis !== 'local-document-read' ? optionalValue(retainedAt, normalizeTimestamp) : undefined;
      return { state: 'retained', basis, ...(observed_at ? { observed_at } : {}), ...(locator ? { locator } : {}) };
    }
    if (!archive && isManual) {
      return { state: 'observed', basis: 'manual-entry', observed_at: acquired_at, ...(locator ? { locator } : {}) };
    }
    if (isManual && acquisition !== 'manual') {
      // Independent schema 1 didn't record a timestamp for edits mixed into a fetched snapshot.
      return { state: 'retained', basis: 'manual-entry', ...(locator ? { locator } : {}) };
    }
    if (!currentTime || !acquisition || acquisition === 'html') {
      return { state: 'unverified', basis: 'local-document-read', ...(locator ? { locator } : {}) };
    }
    return { state: archive || manual ? 'retained' : 'observed',
      basis: isManual ? 'manual-entry' : 'source-observation', observed_at: currentTime,
      ...(locator ? { locator } : {}) };
  };

  for (const key of Object.keys(mappedFields) as LegacyField[]) {
    const value = source[key];
    if (!hasValue(value)) continue;
    let projected: unknown = value;
    if (key === 'last_updated_at') projected = chapterUpdate(source, locators.last_updated_at ?? '');
    if (key === 'cover_url') projected = optionalValue(value, normalizeExternalUrl);
    if (key === 'first_published_at') projected = optionalValue(value, normalizePartialDate);
    if (key === 'first_published_year' && (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 9999)) projected = undefined;
    if (key === 'serialization_status' && !['ongoing', 'completed', 'paused'].includes(String(value))) projected = undefined;
    if (key !== 'cover_url' && (projected === undefined || projected !== value)) original[key] = value;
    if (projected === undefined) {
      warnings.push(key === 'cover_url' ? '封面没有可用的来源图片链接。' : `${key} 保留原文，暂未映射为作品资料。`);
      continue;
    }
    const field = mappedFields[key];
    fields[field] = projected;
    field_evidence[`/fields/${field}`] = evidence(key);
  }

  return normalizeSourceV2({
    protocol: SOURCE_V2_PROTOCOL, ...ref, scope: 'work',
    observation: { acquired_at, method }, fields, field_evidence,
    extensions: { [ref.provider]: {
      version: 1, evidence: locators,
      ...(acquisition ? { acquisition } : {}),
      ...(typeof source.fetched_at === 'string' ? { fetched_at: source.fetched_at } : {}),
      ...(source.latest_chapter ? { latest_chapter: source.latest_chapter } : {}),
      ...(source.word_count_text ? { word_count_text: source.word_count_text } : {}),
      ...(source.retained_fields ? { retained_fields: source.retained_fields } : {}),
      ...(source.retained_field_acquisitions ? { retained_field_acquisitions: source.retained_field_acquisitions } : {}),
      ...(Object.keys(original).length ? { original } : {}),
      ...(warnings.length ? { warnings } : {}),
    } },
  });
}

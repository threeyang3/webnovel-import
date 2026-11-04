import { sourceKey, type SourceMetadata } from './types';

type CanonicalField = 'title' | 'authors' | 'summary' | 'cover' | 'first_published_year' | 'serialization_status';

interface Adoption {
  source_key: string;
  value: unknown;
  evidence?: string;
}

interface ImportState extends Record<string, unknown> {
  schema_version: 1;
  sources: SourceMetadata[];
  adopted: Record<string, Adoption>;
}

export function isCoreManaged(state: unknown): boolean {
  return isRecord(state) && state.schema_version === 2 && state.managed_by === 'media-core';
}

const metadataFields = [
  'title', 'authors', 'description', 'cover_url', 'tags', 'serialization_status',
  'word_count_text', 'first_published_at', 'first_published_year', 'last_updated_at', 'latest_chapter',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readState(frontmatter: Record<string, unknown>): ImportState {
  const state = frontmatter.webnovel_import;
  if (state === undefined) return { schema_version: 1, sources: [], adopted: {} };
  if (isCoreManaged(state)) throw new Error('此作品的来源由 Media Core 托管，请把采集结果导出到 Media Core。');
  if (!isRecord(state) || state.schema_version !== 1) {
    throw new Error('无法更新：webnovel_import.schema_version 必须为 1；现有插件数据未被覆盖。');
  }
  if (!Array.isArray(state.sources) || !isRecord(state.adopted)) {
    throw new Error('无法更新：webnovel_import 的 sources 或 adopted 格式不正确。');
  }
  for (const source of state.sources) {
    if (!isRecord(source) || typeof source.provider !== 'string' || typeof source.id !== 'string' || !source.id) {
      throw new Error('无法更新：来源作品 ID 必须保存为字符串，请先检查 webnovel_import.sources。');
    }
  }
  for (const adoption of Object.values(state.adopted)) {
    if (!isRecord(adoption) || typeof adoption.source_key !== 'string' || !Object.prototype.hasOwnProperty.call(adoption, 'value')) {
      throw new Error('无法更新：webnovel_import.adopted 中存在无效的采纳记录。');
    }
  }
  return state as unknown as ImportState;
}

/** The source list is separate from the Work's independent uid. */
export function getSources(frontmatter: Record<string, unknown>): SourceMetadata[] {
  return [...readState(frontmatter).sources];
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);
}

function isManualField(source: SourceMetadata, field: string): boolean {
  return source.acquisition === 'manual' || source.evidence[field]?.startsWith('manual:') === true;
}

function isMissingSourceField(source: SourceMetadata, field: typeof metadataFields[number]): boolean {
  return isEmpty(source[field]) ||
    (field === 'serialization_status' && source[field] === 'unknown' && !isManualField(source, field));
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
    left.every((value, index) => sameValue(value, right[index]));
}

function shorten(text: string, limit: number): string {
  const characters = Array.from(text);
  if (characters.length <= limit) return text;
  return limit === 0 ? '' : `${characters.slice(0, limit - 1).join('')}…`;
}

/** Retain the last known source value when a later response omits that field. */
function mergeSnapshot(previous: SourceMetadata | undefined, incoming: SourceMetadata): SourceMetadata {
  const snapshot: SourceMetadata = {
    ...previous,
    ...incoming,
    authors: [...incoming.authors],
    evidence: { ...previous?.evidence, ...incoming.evidence },
    warnings: [...incoming.warnings],
  };
  const retainedFields = { ...previous?.retained_fields };
  const retainedAcquisitions = { ...previous?.retained_field_acquisitions };
  if (incoming.tags) snapshot.tags = [...incoming.tags];
  if (incoming.serialization_status === 'unknown' && !isManualField(incoming, 'serialization_status')) {
    delete snapshot.serialization_status;
  }
  for (const field of metadataFields) {
    if (isMissingSourceField(incoming, field) && previous && !isMissingSourceField(previous, field)) {
      // Preserve the last known value without presenting it as observed this time.
      (snapshot as unknown as Record<string, unknown>)[field] = previous[field];
      retainedFields[field] = previous.retained_fields?.[field] ?? previous.fetched_at;
      let acquisition = previous.retained_field_acquisitions?.[field];
      if (previous.retained_fields?.[field] === undefined) {
        acquisition = previous.acquisition === 'manual' || !isManualField(previous, field) ? previous.acquisition : undefined;
      }
      if (acquisition) retainedAcquisitions[field] = acquisition;
      else delete retainedAcquisitions[field];
      if (previous.evidence[field] !== undefined) snapshot.evidence[field] = previous.evidence[field];
      else if (previous.acquisition === 'manual') snapshot.evidence[field] = 'manual:用户手工录入';
    } else {
      delete retainedFields[field];
      delete retainedAcquisitions[field];
      if (!isMissingSourceField(incoming, field) && incoming.evidence[field] === undefined) {
        // Old manual evidence must not be attached to a newly fetched value.
        delete snapshot.evidence[field];
      }
    }
  }
  if (Object.keys(retainedFields).length) snapshot.retained_fields = retainedFields;
  else delete snapshot.retained_fields;
  if (Object.keys(retainedAcquisitions).length) snapshot.retained_field_acquisitions = retainedAcquisitions;
  else delete snapshot.retained_field_acquisitions;
  return snapshot;
}

export function upsertFrontmatter(
  current: Record<string, unknown>,
  incoming: SourceMetadata,
  options: { uid: string; cover?: string; summaryLength: number },
): { frontmatter: Record<string, unknown>; adopted: string[]; preserved: string[] } {
  if (typeof incoming.id !== 'string' || incoming.id.length === 0) {
    throw new Error('来源作品 ID 必须为非空字符串。');
  }
  if (!Number.isInteger(options.summaryLength) || options.summaryLength < 0) {
    throw new Error('简介字数上限必须为非负整数。');
  }

  const previousState = readState(current);
  const key = sourceKey(incoming);
  const sources = [...previousState.sources];
  const sourceIndex = sources.findIndex(source => sourceKey(source) === key);
  const snapshot = mergeSnapshot(sources[sourceIndex], incoming);
  if (sourceIndex < 0) sources.push(snapshot);
  else sources[sourceIndex] = snapshot;

  const frontmatter = { ...current };
  for (const [field, value] of Object.entries({ uid: options.uid, type: 'work', media: 'webnovel' })) {
    if (!Object.prototype.hasOwnProperty.call(frontmatter, field)) frontmatter[field] = value;
  }

  const adoptionRecords = { ...previousState.adopted };
  const adopted: string[] = [];
  const preserved: string[] = [];
  const candidates: { field: CanonicalField; sourceField: string; value: unknown }[] = [
    { field: 'title', sourceField: 'title', value: incoming.title },
    { field: 'authors', sourceField: 'authors', value: incoming.authors },
    { field: 'summary', sourceField: 'description', value: incoming.description === undefined ? undefined : shorten(incoming.description, options.summaryLength) },
    { field: 'cover', sourceField: 'cover_url', value: options.cover || incoming.cover_url },
    // A recent update or chapter date is never a publication year.
    { field: 'first_published_year', sourceField: 'first_published_year', value: incoming.first_published_year },
    { field: 'serialization_status', sourceField: 'serialization_status', value: incoming.serialization_status },
  ];

  for (const { field, sourceField, value } of candidates) {
    if (isEmpty(value)) continue;
    const evidence = incoming.evidence[sourceField];
    const manual = isManualField(incoming, sourceField);
    if (field === 'serialization_status' && value === 'unknown' && !manual) continue;
    const previous = adoptionRecords[field];
    const mayUpdate = previous
      ? (previous.source_key === key || (manual && previous.source_key === `manual:${key}`)) &&
        sameValue(frontmatter[field], previous.value)
      : isEmpty(frontmatter[field]);

    if (!mayUpdate) {
      preserved.push(field);
      continue;
    }
    const newValue = Array.isArray(value) ? [...value] : value;
    frontmatter[field] = newValue;
    adoptionRecords[field] = {
      source_key: manual ? `manual:${key}` : key,
      // Keep the baseline independent from the value exposed in frontmatter.
      value: Array.isArray(value) ? [...value] : value,
      ...(manual ? { evidence: evidence || 'manual:用户手工录入' } : {}),
    };
    adopted.push(field);
  }

  frontmatter.webnovel_import = {
    ...previousState,
    schema_version: 1,
    sources,
    adopted: adoptionRecords,
  } satisfies ImportState;

  return { frontmatter, adopted, preserved };
}

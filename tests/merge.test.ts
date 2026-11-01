import assert from 'node:assert/strict';
import test from 'node:test';
import { getSources, upsertFrontmatter } from '../src/merge';
import type { SourceMetadata } from '../src/types';

const options = { uid: 'work-independent-uuid', summaryLength: 8 };
function source(overrides: Partial<SourceMetadata> = {}): SourceMetadata {
  return {
    provider: 'qidian', id: '1010868264', url: 'https://www.qidian.com/book/1010868264/',
    title: '示例作品', authors: ['作者'], description: '一部作品的简介',
    first_published_year: 2020, serialization_status: 'ongoing',
    fetched_at: '2026-11-01T00:00:00.000Z', acquisition: 'remote', evidence: {}, warnings: [],
    ...overrides,
  };
}

test('Work uses independent identity and preserves existing personal fields and namespace properties', () => {
  const first = upsertFrontmatter({}, source(), options).frontmatter;
  assert.equal(first.uid, options.uid);
  assert.equal(first.type, 'work');
  assert.equal(first.media, 'webnovel');
  assert.notEqual(first.uid, source().id);

  const current = {
    ...first, uid: 'existing-work', type: 'my-work', media: 'novel',
    tags: ['个人标签'], reading_status: 'reading', rating: 9, review: '自己的简评', series: ['自己的系列'],
    webnovel_import: { ...(first.webnovel_import as Record<string, unknown>), customSetting: 'keep' },
  };
  const before = JSON.stringify(current);
  const refreshed = upsertFrontmatter(current, source({ tags: ['平台标签'] }), options).frontmatter;
  for (const field of ['uid', 'type', 'media', 'tags', 'reading_status', 'rating', 'review', 'series'] as const) {
    assert.deepEqual(refreshed[field], current[field]);
  }
  assert.equal((refreshed.webnovel_import as Record<string, unknown>).customSetting, 'keep');
  assert.equal(JSON.stringify(current), before);
});

test('same provider and string ID refresh one source; another source fills gaps without taking ownership', () => {
  const first = upsertFrontmatter({}, source({ cover_url: undefined }), options).frontmatter;
  const another = source({
    provider: 'fanqie', id: '7280000000000000001', url: 'https://fanqienovel.com/page/7280000000000000001',
    title: '另一个标题', cover_url: 'https://example.com/cover.jpg', first_published_year: 2022,
  });
  const merged = upsertFrontmatter(first, another, options);
  assert.equal(merged.frontmatter.title, '示例作品');
  assert.equal(merged.frontmatter.first_published_year, 2020);
  assert.equal(merged.frontmatter.cover, another.cover_url);
  assert.equal(merged.frontmatter.uid, options.uid);
  assert.equal(getSources(merged.frontmatter).length, 2);
  assert.equal(getSources(merged.frontmatter)[1].id, '7280000000000000001');
  assert.ok(merged.preserved.includes('title'));

  const updated = upsertFrontmatter(merged.frontmatter, source({ title: '来源改名' }), options).frontmatter;
  assert.equal(updated.title, '来源改名');
  assert.equal(getSources(updated).length, 2);
});

test('three-way comparison protects manual edits, manual clearing and pre-existing values', () => {
  const first = upsertFrontmatter({ title: '已有书名' }, source(), options).frontmatter;
  assert.equal(first.title, '已有书名');
  const current = { ...first, authors: ['用户改过的作者'], summary: '' };
  const result = upsertFrontmatter(current, source({ title: '网上改名', authors: ['网上作者'], description: '网上的新简介' }), options);
  assert.equal(result.frontmatter.title, '已有书名');
  assert.deepEqual(result.frontmatter.authors, ['用户改过的作者']);
  assert.equal(result.frontmatter.summary, '');
  assert.deepEqual(result.preserved.filter(field => ['title', 'authors', 'summary'].includes(field)), ['title', 'authors', 'summary']);
});

test('missing fields and remote unknown status preserve known values with their original observation times', () => {
  const first = upsertFrontmatter({}, source({ first_published_year: undefined, last_updated_at: '2026-11-01' }), options).frontmatter;
  assert.equal(first.first_published_year, undefined);
  const known = upsertFrontmatter(first, source({ cover_url: 'https://example.com/cover.jpg', serialization_status: 'completed' }), options).frontmatter;
  const updated = upsertFrontmatter(known, source({
    first_published_year: undefined, description: undefined, authors: [], cover_url: undefined,
    last_updated_at: '2027-01-01', serialization_status: 'unknown', fetched_at: '2027-01-01T00:00:00.000Z',
  }), options).frontmatter;
  assert.equal(updated.first_published_year, 2020);
  assert.equal(updated.summary, known.summary);
  assert.deepEqual(updated.authors, ['作者']);
  assert.equal(updated.cover, 'https://example.com/cover.jpg');
  assert.equal(updated.serialization_status, 'completed');
  assert.equal(getSources(updated)[0].first_published_year, 2020);
  assert.equal(getSources(updated)[0].last_updated_at, '2027-01-01');
  assert.equal(getSources(updated)[0].serialization_status, 'completed');
  assert.equal(getSources(updated)[0].fetched_at, '2027-01-01T00:00:00.000Z');
  assert.equal(getSources(updated)[0].retained_fields?.serialization_status, source().fetched_at);
  assert.equal(getSources(updated)[0].retained_fields?.first_published_year, source().fetched_at);

  const stillMissing = upsertFrontmatter(updated, source({
    first_published_year: undefined, serialization_status: undefined, fetched_at: '2027-02-01T00:00:00.000Z',
  }), options).frontmatter;
  assert.equal(getSources(stillMissing)[0].retained_fields?.serialization_status, source().fetched_at);
  assert.equal(getSources(stillMissing)[0].retained_fields?.first_published_year, source().fetched_at);

  const recovered = upsertFrontmatter(stillMissing, source({ fetched_at: '2027-03-01T00:00:00.000Z' }), options).frontmatter;
  assert.equal(recovered.serialization_status, 'ongoing');
  assert.equal(getSources(recovered)[0].retained_fields?.serialization_status, undefined);
  assert.equal(getSources(recovered)[0].retained_fields?.first_published_year, undefined);

  const manualUnknown = upsertFrontmatter(recovered, source({
    serialization_status: 'unknown', evidence: { serialization_status: 'manual:用户明确选择未知' },
  }), options).frontmatter;
  assert.equal(manualUnknown.serialization_status, 'unknown');
  assert.equal(getSources(manualUnknown)[0].serialization_status, 'unknown');
});

test('manual acquisition and per-field manual evidence survive later remote refreshes', () => {
  const first = upsertFrontmatter({}, source({
    title: '人工书名', acquisition: 'manual', evidence: { title: 'manual:用户补填/修改' },
  }), options).frontmatter;
  const refreshed = upsertFrontmatter(first, source({ title: '网上书名' }), options).frontmatter;
  assert.equal(refreshed.title, '人工书名');
  assert.equal(getSources(refreshed)[0].title, '网上书名');
  assert.equal(getSources(refreshed)[0].evidence.title, undefined);
  const state = refreshed.webnovel_import as { adopted: Record<string, { source_key: string; evidence?: string }> };
  assert.equal(state.adopted.title.source_key, 'manual:qidian:1010868264');
  assert.equal(state.adopted.title.evidence, 'manual:用户补填/修改');

  const partlyManual = upsertFrontmatter({}, source({
    description: '人工修改简介', evidence: { description: 'manual:用户补填/修改' },
  }), options).frontmatter;
  const newer = upsertFrontmatter(partlyManual, source({ title: '新书名', description: '网上简介' }), options).frontmatter;
  assert.equal(newer.title, '新书名');
  assert.equal(newer.summary, '人工修改简介');
});

test('summary length counts Unicode code points including ellipsis, and unsupported schemas fail explicitly', () => {
  const result = upsertFrontmatter({}, source({ description: '甲😀乙丙丁' }), { ...options, summaryLength: 4 });
  assert.equal(result.frontmatter.summary, '甲😀乙…');
  assert.equal(Array.from(result.frontmatter.summary as string).length, 4);
  const current = { webnovel_import: { schema_version: 2, sources: [], adopted: {} }, title: '保留' };
  assert.throws(() => upsertFrontmatter(current, source(), options), /schema_version/);
  assert.throws(() => getSources(current), /schema_version/);
  assert.equal(current.title, '保留');
});

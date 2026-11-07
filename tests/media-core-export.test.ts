import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DOMParser as TestDOMParser } from 'linkedom';
import { normalizeSourceV2 } from '../vendor/media-source-v2.cjs';
import { toMediaCoreSource } from '../src/media-core-export';
import { getSources, upsertFrontmatter } from '../src/merge';
import { parseBookUrl, parseSourceHtml } from '../src/sources';
import type { SourceMetadata } from '../src/types';

Object.defineProperty(globalThis, 'DOMParser', { value: TestDOMParser, configurable: true });

const ref = parseBookUrl('https://fanqienovel.com/page/000000000000000000001');
const html = `<!doctype html><link rel="canonical" href="${ref.url}">
  <div class="page-header-info"><div class="info-name"><h1>Unknown</h1></div>
    <span class="author-name-text">某某 / 署名</span><span class="info-label-yellow">已完结</span>
    <div class="info-count-word">320.1 万字</div><span class="info-last-title">最近更新：番外</span>
    <span class="info-last-time">2025-10-31 22:10</span>
  </div><div class="page-body"><p class="page-abstract-content">提到 2024 年的原始简介。</p></div>`;
const options = { uid: 'work-independent', summaryLength: 8 };
const captured = '2026-11-01T03:04:05.000Z';
const exported = '2026-11-04T11:00:00.000Z';
const now = () => exported;

function source(acquisition: SourceMetadata['acquisition'] = 'remote'): SourceMetadata {
  return { ...parseSourceHtml(html, ref, 'remote'), acquisition, fetched_at: captured };
}

test('the common contract fixture validates using the same frozen artifact as Media Core', () => {
  const example = JSON.parse(readFileSync('vendor/examples/media-source-v2.json', 'utf8'));
  assert.equal(normalizeSourceV2(example).protocol, 'media-source/v2');
  assert.throws(() => normalizeSourceV2({ ...example, fields: { ...example.fields, uid: 'external' } }), /fields\/uid/);
});

test('ordinary Fanqie parser output retains string IDs, full summary and precise chapter time', () => {
  const observation = toMediaCoreSource(source(), { now });
  assert.equal(observation.id, '000000000000000000001');
  assert.deepEqual(observation.observation, { acquired_at: captured, method: 'remote' });
  assert.deepEqual(observation.fields, {
    title: 'Unknown', summary: '提到 2024 年的原始简介。', authors: ['某某 / 署名'],
    latest_chapter_updated_at: '2025-10-31T22:10', original_status: 'completed',
  });
  assert.match(JSON.stringify(observation.extensions), /320\.1万字/);
  assert.match(JSON.stringify(observation.extensions), /番外/);
  assert.match(JSON.stringify(observation.extensions), /2025-10-31 22:10/);
  assert.deepEqual(normalizeSourceV2(observation), observation);
});

test('four providers export versioned extensions and preserve platform-specific time evidence', () => {
  for (const [url, locator, chapterTime] of [
    ['https://www.qidian.com/book/100/', '#book-detail .update-time', '2025-10-31T22:10'],
    ['https://fanqienovel.com/page/000000000000000000001', '.info-last-time', '2025-10-31T22:10'],
    ['https://www.qimao.com/shuku/200/', '.book-information .update-info .update-time', '2025-10-31T22:10'],
    ['https://m.jjwxc.net/book2/300', 'body > meta[itemprop="dateModified"]', undefined],
    ['https://www.jjwxc.net/onebook.php?novelid=300',
      'tr[itemprop~="newestChapter"] td[title*="章节首发时间"] 的可见更新时间', '2025-10-31T22:10'],
  ] as const) {
    const ref = parseBookUrl(url);
    const metadata: SourceMetadata = {
      ...ref, title: '作品', authors: ['作者'], acquisition: 'browser', fetched_at: captured,
      latest_chapter: '测试最新章', word_count_text: '12.1万字', last_updated_at: '2025-10-31 22:10',
      evidence: { last_updated_at: locator }, warnings: [],
    };
    const observation = normalizeSourceV2(toMediaCoreSource(metadata, { now }));
    assert.equal(observation.id, ref.id);
    assert.equal(observation.url, ref.url);
    const fields = observation.fields as Record<string, unknown>;
    assert.equal(fields.year, undefined);
    assert.equal(fields.release_date, undefined);
    assert.equal(fields.latest_chapter_updated_at, chapterTime);
    const extensions = observation.extensions as Record<string, Record<string, unknown>>;
    const extension = extensions[ref.provider];
    assert.equal(extension.version, 1);
    assert.equal(extension.word_count_text, '12.1万字');
    assert.deepEqual(extension.original, { last_updated_at: '2025-10-31 22:10' });
  }
});

test('HTML reads and legacy retained timestamps lacking original basis do not invent observations', () => {
  const htmlObservation = toMediaCoreSource(source('html'), { now });
  assert.deepEqual(htmlObservation.observation, { acquired_at: captured, method: 'html' });
  for (const item of Object.values(htmlObservation.field_evidence as Record<string, { state: string; observed_at?: string }>)) {
    assert.equal(item.state, 'unverified');
    assert.equal(item.observed_at, undefined);
  }
  const htmlMetadata = source('html');
  const editedHtml = toMediaCoreSource({
    ...htmlMetadata, title: '手改标题', evidence: { ...htmlMetadata.evidence, title: 'manual:用户补填' },
  }, { now });
  const htmlEvidence = editedHtml.field_evidence as Record<string, unknown>;
  assert.deepEqual(editedHtml.observation, { acquired_at: captured, method: 'html' });
  assert.deepEqual(htmlEvidence['/fields/title'], {
    state: 'observed', basis: 'manual-entry', observed_at: exported, locator: 'manual:用户补填',
  });
  assert.deepEqual(htmlEvidence['/fields/authors'], {
    state: 'unverified', basis: 'local-document-read', locator: '作品页 .page-header-info .author-name-text',
  });

  const remoteMetadata = source();
  const legacy = toMediaCoreSource({
    ...remoteMetadata, title: '旧档手改标题', evidence: { ...remoteMetadata.evidence, title: 'manual:用户补填' },
    last_updated_at: '3 天前', serialization_status: 'unknown',
    retained_fields: { description: captured },
  }, { archive: true, now });
  const { fields, field_evidence } = legacy as { fields: Record<string, unknown>; field_evidence: Record<string, unknown> };
  assert.deepEqual(legacy.observation, { acquired_at: exported, method: 'archive' });
  assert.equal(fields.latest_chapter_updated_at, undefined);
  assert.equal(fields.original_status, undefined);
  assert.match(JSON.stringify(legacy.extensions), /3 天前/);
  assert.match(JSON.stringify(legacy.extensions), /retained_fields/);
  assert.deepEqual(field_evidence['/fields/title'], {
    state: 'retained', basis: 'manual-entry', locator: 'manual:用户补填',
  });
  assert.deepEqual(field_evidence['/fields/authors'], {
    state: 'retained', basis: 'source-observation', observed_at: captured, locator: '作品页 .page-header-info .author-name-text',
  });
  assert.deepEqual(field_evidence['/fields/summary'], {
    state: 'retained', basis: 'local-document-read', locator: '作品页 .page-body .page-abstract-content',
  });
});

test('a later partial read retains earlier known evidence without changing independent schema 1', () => {
  const first = upsertFrontmatter({}, source(), options).frontmatter;
  const second = upsertFrontmatter({ ...first, summary: '手改简介', rating: 9 }, {
    ...source(), fetched_at: '2026-11-02T02:00:00Z', description: undefined,
  }, options).frontmatter;
  assert.equal(second.summary, '手改简介');
  assert.equal(second.rating, 9);
  const [saved] = getSources(second);
  assert.equal(saved.retained_field_acquisitions?.description, 'remote');
  const observation = toMediaCoreSource(saved, { archive: true, now });
  assert.deepEqual(observation.observation, { acquired_at: exported, method: 'archive' });
  const evidence = observation.field_evidence as Record<string, { state: string; observed_at: string }>;
  assert.equal(evidence['/fields/summary'].state, 'retained');
  assert.equal(evidence['/fields/summary'].observed_at, captured);
});

test('live source fields keep their observation when another field is corrected', () => {
  for (const method of ['remote', 'browser'] as const) {
    const metadata = source(method);
    const observation = toMediaCoreSource({
      ...metadata, title: '手改标题', evidence: { ...metadata.evidence, title: 'manual:用户补填' },
    }, { now });
    assert.deepEqual(observation.observation, { acquired_at: captured, method });
    const evidence = observation.field_evidence as Record<string, unknown>;
    assert.deepEqual(evidence['/fields/title'], {
      state: 'observed', basis: 'manual-entry', observed_at: exported, locator: 'manual:用户补填',
    });
    assert.deepEqual(evidence['/fields/authors'], {
      state: 'observed', basis: 'source-observation', observed_at: captured, locator: '作品页 .page-header-info .author-name-text',
    });
    assert.deepEqual(evidence['/fields/summary'], {
      state: 'observed', basis: 'source-observation', observed_at: captured, locator: '作品页 .page-body .page-abstract-content',
    });
  }
});

test('manual input keeps its own evidence and the managed guard rejects independent writes', () => {
  const metadata = source('manual');
  const observation = toMediaCoreSource(metadata, { now });
  assert.deepEqual(observation.observation, { acquired_at: exported, method: 'manual' });
  assert.deepEqual((observation.field_evidence as Record<string, unknown>)['/fields/title'], {
    state: 'observed', basis: 'manual-entry', observed_at: exported, locator: metadata.evidence.title,
  });
  const managed = { uid: 'work-kept', rating: 0, webnovel_import: { schema_version: 2, managed_by: 'media-core', sources: [ref] } };
  const before = JSON.stringify(managed);
  assert.throws(() => upsertFrontmatter(managed, metadata, options), /Media Core 托管/);
  assert.equal(JSON.stringify(managed), before);
  assert.throws(() => toMediaCoreSource({ ...metadata, id: 'wrong-id' }), /链接与 ID 不一致/);
});

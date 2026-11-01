import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCapture, parseCapturePayload } from '../src/browser-capture';
import type { SourceMetadata } from '../src/types';

const metadata: SourceMetadata = {
  provider: 'qidian', id: '1010868264', url: 'https://www.qidian.com/book/1010868264/',
  title: '采集合成作品', authors: ['合成作者'], description: '第一段\n第二段',
  cover_url: 'https://bookcover.yuewen.com/qdbimg/349573/1010868264/600.webp',
  tags: ['玄幻'], serialization_status: 'completed', word_count_text: '12.3万字',
  last_updated_at: '2026-11-01 12:30:00', fetched_at: '2026-11-01T06:00:00.000Z',
  acquisition: 'browser', evidence: { title: '#bookName' }, warnings: [],
};

test('browser capture preserves source metadata while excluding personal fields and unsupported publication claims', () => {
  const raw = encodeCapture({ ...metadata, personal_review: '不应进入来源', uid: '不要采用', first_published_year: 2026 } as SourceMetadata);
  const result = parseCapturePayload(raw);
  assert.equal(result.title, metadata.title);
  assert.deepEqual(result.authors, metadata.authors);
  assert.equal(result.description, '第一段\n第二段');
  assert.equal(result.cover_url, metadata.cover_url);
  assert.equal(result.acquisition, 'browser');
  assert.equal(result.last_updated_at, metadata.last_updated_at);
  assert.equal(result.first_published_year, undefined);
  assert.equal('uid' in result, false);
  assert.equal('personal_review' in result, false);
  assert.match(result.evidence.acquisition, /本机剪贴板/);
});

test('browser capture rejects unrelated clipboard content, incompatible versions, wrong book identities and unsafe covers', () => {
  assert.throws(() => parseCapturePayload('这是普通剪贴板文字'), /不是网文采集结果/);
  assert.throws(() => parseCapturePayload(JSON.stringify({ format: 'webnovel-import-capture', version: 2, metadata })), /格式/);
  assert.throws(() => parseCapturePayload(encodeCapture({ ...metadata, id: '1048862481' })), /标识不一致/);
  assert.throws(() => parseCapturePayload(encodeCapture({ ...metadata, cover_url: 'javascript:alert(1)' })), /封面地址无效/);
});

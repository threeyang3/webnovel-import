import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';
import type { App, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, type SourceMetadata } from '../src/types';

class MockFile {
  constructor(readonly path: string) {}
}

const obsidian = {
  TFile: MockFile,
  normalizePath: (value: string) => value,
  getFrontMatterInfo: (markdown: string) => ({ exists: true, frontmatter: markdown.split('---\n')[1] }),
  parseYaml: JSON.parse,
  stringifyYaml: (value: unknown) => JSON.stringify(value) + '\n',
  requestUrl: async () => ({ status: 200, headers: { 'content-type': 'image/png' }, arrayBuffer: new ArrayBuffer(8) }),
};

function loadImporter(): typeof import('../src/importer').Importer {
  // Obsidian supplies the runtime module. The npm package only contains types.
  const loader = Module as typeof Module & { _load: (name: string, ...args: unknown[]) => unknown };
  const load = loader._load;
  loader._load = function (name, ...args) {
    return name === 'obsidian' ? obsidian : load.call(this, name, ...args);
  };
  try { return (require('../src/importer') as typeof import('../src/importer')).Importer; }
  finally { loader._load = load; }
}

const Importer = loadImporter();
const metadata: SourceMetadata = {
  provider: 'fanqie', id: '7280000000000000001', url: 'https://fanqienovel.com/page/7280000000000000001',
  title: '示例作品', authors: ['作者'], cover_url: 'https://example.com/cover.png',
  fetched_at: '2026-11-01T00:00:00.000Z', acquisition: 'remote', evidence: {}, warnings: [],
};

function fixture(frontmatter?: Record<string, unknown>, cached = frontmatter, coverStatuses: number[] = []) {
  const target = new MockFile('已有作品.md');
  const files = new Map<string, MockFile | { path: string }>();
  const notes = new Map<MockFile, string>();
  const counters = { downloads: 0, attachments: 0, creates: 0, updates: 0 };
  if (frontmatter) {
    files.set(target.path, target);
    notes.set(target, `---\n${JSON.stringify(frontmatter)}\n---\n\n个人正文\n`);
  }
  obsidian.requestUrl = async () => {
    counters.downloads++;
    return { status: coverStatuses.shift() ?? 200, headers: { 'content-type': 'image/png' }, arrayBuffer: new ArrayBuffer(8) };
  };
  const app = {
    metadataCache: { getFileCache: (file: MockFile) => file === target ? { frontmatter: cached } : null },
    vault: {
      getMarkdownFiles: () => [...notes.keys()],
      getAbstractFileByPath: (path: string) => files.get(path),
      read: async (file: MockFile) => notes.get(file),
      createFolder: async (path: string) => { files.set(path, { path }); },
      createBinary: async (path: string) => { counters.attachments++; files.set(path, new MockFile(path)); },
      create: async (path: string, markdown: string) => {
        const file = new MockFile(path);
        counters.creates++; files.set(path, file); notes.set(file, markdown);
        return file;
      },
    },
    fileManager: {
      generateMarkdownLink: (file: MockFile, _source: string, _subpath: string, alias: string) => `[[${file.path}|${alias}]]`,
      processFrontMatter: async (file: MockFile, callback: (value: Record<string, unknown>) => void) => {
        const [start, yaml, body] = notes.get(file)!.split('---\n');
        const current = JSON.parse(yaml);
        callback(current);
        counters.updates++;
        notes.set(file, `${start}---\n${JSON.stringify(current)}\n---\n${body}`);
      },
    },
  };
  return { importer: new Importer(app as unknown as App, () => DEFAULT_SETTINGS), target, notes, counters, files };
}

test('direct association validates live Work state before requesting or writing a cover', async () => {
  const schemas = [
    { schema_version: 1, sources: [], adopted: null },
    { schema_version: 2, managed_by: 'media-core', sources: [] },
    { schema_version: 2, managed_by: 'media-core', sources: [], handoff_pending: { version: 1 } },
  ];
  for (const webnovel_import of schemas) {
    const personal = { uid: 'original-uid', title: '原书名', rating: 0, review: '自己的短评' };
    const { importer, target, notes, counters } = fixture({ ...personal, webnovel_import }, personal);
    const before = notes.get(target);
    await assert.rejects(importer.import(metadata, target as unknown as TFile), /sources 或 adopted|Media Core 托管/);
    assert.deepEqual(counters, { downloads: 0, attachments: 0, creates: 0, updates: 0 });
    assert.equal(notes.get(target), before);
  }
});

test('managed source ownership prevents a second independent Work and cover', async () => {
  const { importer, counters } = fixture({
    webnovel_import: { schema_version: 2, managed_by: 'media-core', sources: [metadata] },
  });
  await assert.rejects(importer.import(metadata), /Media Core 托管/);
  assert.deepEqual(counters, { downloads: 0, attachments: 0, creates: 0, updates: 0 });
});

test('queued duplicate submissions share one Work and retry a failed cover', async () => {
  const { importer, notes, counters } = fixture(undefined, undefined, [503, 200]);
  const [first, second] = await Promise.all([importer.import(metadata), importer.import(metadata)]);
  assert.equal(first.created, true);
  assert.match(first.warnings.join(' '), /封面未下载/);
  assert.equal(second.created, false);
  assert.equal(second.file, first.file);
  assert.deepEqual(second.warnings, []);
  assert.equal(notes.size, 1);
  assert.equal(counters.creates, 1);
  assert.equal(counters.attachments, 1);
});

test('manual work has an independent identity, no platform source, and a local reference', async () => {
  const { importer, notes, counters, files } = fixture();
  const cover = '本地图片/旧封面.png';
  files.set(cover, new MockFile(cover));
  await assert.rejects(importer.createManual({ title: '   ' }), /书名/);
  await assert.rejects(importer.createManual({ title: '示例', first_published_at: '2021-02-29' }), /日期/);
  await assert.rejects(importer.createManual({ title: '示例', cover: 'missing.png' }), /图片路径/);
  await assert.rejects(importer.createManual({ title: '示例', reference: { url: 'file:///tmp/archive' } }), /历史链接/);
  const reference = { platform: '旧站', url: 'https://example.test/deleted', note: '私人存档' };
  const file = await importer.createManual({
    title: ' 已下架作品 ', cover, summary: '完整的本地简介', first_published_at: '2020-02-29',
    serialization_status: 'paused', word_count_text: '120 万字', tags: ['幻想', '冒险'], reference,
  });
  const markdown = notes.get(file as unknown as MockFile)!;
  const [, yaml, body] = markdown.split('---\n');
  const fm = JSON.parse(yaml);
  assert.match(fm.uid, /^work-[a-f0-9-]{36}$/);
  assert.equal(fm.title, '已下架作品');
  assert.equal(fm.media, 'webnovel');
  assert.equal(fm.type, 'work');
  assert.equal(fm.authors, undefined);
  assert.equal(fm.cover, cover);
  assert.equal(fm.first_published_year, 2020);
  assert.equal(fm.first_published_at, '2020-02-29');
  assert.equal(fm.serialization_status, 'paused');
  assert.equal(fm.word_count_text, '120 万字');
  assert.deepEqual(fm.tags, ['幻想', '冒险']);
  assert.deepEqual(fm.webnovel_import.manual_reference, reference);
  assert.equal(fm.webnovel_import.schema_version, 1);
  assert.deepEqual(importer.sources(file), []);
  assert.equal(fm.webnovel_import.adopted.summary.source_key, 'manual:local');
  assert.match(body, /!\[\[本地图片\/旧封面\.png\|封面\]\]/);
  assert.doesNotMatch(body, /作品详情|example\.test/);
  assert.deepEqual(counters, { downloads: 0, attachments: 0, creates: 1, updates: 0 });
});

test('queued manual duplicate prompts and an authorless manual Work can receive a formal source with local clears protected', async () => {
  const { importer, notes, counters } = fixture();
  const draft = { title: metadata.title, summary: '人工简介', cover: 'https://example.test/manual.png' };
  const first = importer.createManual(draft);
  const duplicate = importer.createManual(draft);
  const file = await first;
  await assert.rejects(duplicate, /选择打开已有作品或确认独立创建/);
  assert.deepEqual(importer.previewManualMatches({ ...draft, authors: metadata.authors }), [file]);
  assert.deepEqual(importer.previewMatches(metadata).candidates, [file]);
  await assert.rejects(importer.import(metadata), /请选择|请单独预览/);
  assert.equal(counters.creates, 1);
  assert.equal(counters.downloads, 0);

  const mockedFile = file as unknown as MockFile;
  const fm = JSON.parse(notes.get(mockedFile)!.split('---\n')[1]);
  const body = '\n我自己的正文\n';
  fm.title = '人工编辑的标题';
  fm.summary = '';
  fm.rating = 0;
  fm.progress = 12;
  fm.review = '我的短评';
  notes.set(mockedFile, `---\n${JSON.stringify(fm)}\n---\n${body}`);
  const remote = { ...metadata, description: '站点简介' };
  const attached = await importer.import(remote, file);
  const repeated = await importer.import(remote);
  assert.equal(attached.file, file);
  assert.equal(repeated.file, file);
  assert.equal(repeated.created, false);
  const [, yaml, savedBody] = notes.get(mockedFile)!.split('---\n');
  const saved = JSON.parse(yaml);
  assert.equal(saved.uid, fm.uid);
  assert.equal(saved.title, fm.title);
  assert.equal(saved.summary, '');
  assert.equal(saved.cover, fm.cover);
  assert.deepEqual(saved.authors, metadata.authors);
  assert.equal(saved.rating, 0);
  assert.equal(saved.progress, 12);
  assert.equal(saved.review, fm.review);
  assert.equal(savedBody, body);
  assert.equal(saved.webnovel_import.sources.length, 1);
  assert.equal(saved.webnovel_import.sources[0].id, metadata.id);
});

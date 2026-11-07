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
      processFrontMatter: async (file: MockFile, callback: (value: Record<string, unknown>) => void) => {
        const [start, yaml, body] = notes.get(file)!.split('---\n');
        const current = JSON.parse(yaml);
        callback(current);
        counters.updates++;
        notes.set(file, `${start}---\n${JSON.stringify(current)}\n---\n${body}`);
      },
    },
  };
  return { importer: new Importer(app as unknown as App, () => DEFAULT_SETTINGS), target, notes, counters };
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

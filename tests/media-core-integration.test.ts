import test from 'node:test';
import assert from 'node:assert/strict';
import type { App } from 'obsidian';
import { openMediaCorePreview, resolveImportRoute, resolveManualWorkRoute } from '../src/media-core-integration';

const id = 'media-core';
const source = { protocol: 'media-source/v2', provider: 'fanqie', id: '7143038691944959011' };

function withCore({ installed = true, enabled = true, plugin }: {
  installed?: boolean; enabled?: boolean; plugin?: unknown;
} = {}): App {
  return { plugins: {
    manifests: installed ? { [id]: {} } : {},
    enabledPlugins: new Set(enabled ? [id] : []),
    getPlugin: (key: string) => key === id ? plugin : undefined,
  } } as unknown as App;
}

test('only explicit independent mode or confirmed Core absence in auto mode can use the independent writer', () => {
  const absent = withCore({ installed: false, enabled: false });
  assert.equal(resolveImportRoute(absent, 'auto').kind, 'independent');
  assert.equal(resolveImportRoute(absent, 'media-core').kind, 'unavailable');
  for (const app of [withCore({ enabled: false }), withCore(), withCore({ plugin: {} }), {} as App]) {
    assert.equal(resolveImportRoute(app, 'auto').kind, 'unavailable');
    assert.equal(resolveImportRoute(app, 'media-core').kind, 'unavailable');
    assert.equal(resolveImportRoute(app, 'independent').kind, 'independent');
  }
});

test('the current intake receives the v2 object and optional explicit UID and its errors reach the caller', async () => {
  let calls = 0;
  const failure = new Error('Core preview failed');
  const intake = {
    apiVersion: 1, sourceSchema: source.protocol,
    async openSourcePreview(input: unknown, options: unknown) {
      assert.equal(input, source);
      assert.deepEqual(options, { targetUid: 'existing-work' });
      calls++;
      throw failure;
    },
  };
  const app = withCore({ plugin: { sourceIntake: intake } });
  assert.equal(resolveImportRoute(app, 'auto').kind, 'core');
  await assert.rejects(openMediaCorePreview(app, 'auto', source, 'existing-work'), error => error === failure);
  await assert.rejects(openMediaCorePreview(app, 'auto', { protocol: 'media-source/v1' }), /来源协议/);
  await assert.rejects(openMediaCorePreview(app, 'independent', source), /独立模式/);
  for (const sourceIntake of [{ ...intake, apiVersion: 2 }, { ...intake, sourceSchema: 'media-source/v3' }]) {
    const incompatible = withCore({ plugin: { sourceIntake } });
    assert.equal(resolveImportRoute(incompatible, 'auto').kind, 'unavailable');
    await assert.rejects(openMediaCorePreview(incompatible, 'auto', source), /不支持一键导入/);
  }
  assert.equal(calls, 1);
});

test('manual intake checks its separate capability and receives a draft without a platform identity', async () => {
  const draft = { title: '已下架作品' };
  const intake = { apiVersion: 1, sourceSchema: source.protocol, async openSourcePreview() {} };
  const oldCore = withCore({ plugin: { sourceIntake: intake } });
  assert.equal(resolveImportRoute(oldCore, 'auto').kind, 'core');
  assert.match(resolveManualWorkRoute(oldCore, 'auto').kind, /independent/);
  const onAccepted = () => {};
  const sourceIntake = {
    ...intake, manualWorkApiVersion: 1,
    async openManualWork(input: unknown, options: unknown) {
      assert.equal(this, sourceIntake);
      assert.deepEqual(input, draft);
      assert.deepEqual(options, { onAccepted });
    },
  };
  const app = withCore({ plugin: { sourceIntake } });
  const route = resolveManualWorkRoute(app, 'auto');
  assert.equal(route.kind, 'core');
  if (route.kind === 'core') await route.openPreview(draft, { onAccepted });
  assert.equal(resolveManualWorkRoute(app, 'independent').kind, 'independent');
  assert.equal(resolveManualWorkRoute(withCore({ enabled: false, plugin: { sourceIntake } }), 'auto').kind, 'independent');
});

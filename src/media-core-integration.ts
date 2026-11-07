import type { App } from 'obsidian';
import { SOURCE_V2_PROTOCOL } from '../vendor/media-source-v2.cjs';
import type { ImportMode } from './types';
import type { ManualWorkDraft } from './manual-work';

const CORE_ID = 'media-core';

interface ManualWorkPreviewOptions { onAccepted?: () => void }

interface SourceIntake {
  apiVersion: number;
  sourceSchema: string;
  openSourcePreview(source: unknown, options?: { targetUid?: string }): Promise<void>;
  manualWorkApiVersion?: number;
  openManualWork?(draft: ManualWorkDraft, options?: ManualWorkPreviewOptions): Promise<void>;
}

interface PluginRegistry {
  getPlugin?(id: string): { sourceIntake?: Partial<SourceIntake> } | undefined;
  manifests?: Record<string, unknown>;
  enabledPlugins?: ReadonlySet<string>;
}

export type ImportRoute =
  | { kind: 'independent' }
  | { kind: 'core'; intake: SourceIntake }
  | { kind: 'unavailable'; message: string };

export type ManualWorkRoute =
  | { kind: 'core'; openPreview(draft: ManualWorkDraft, options?: ManualWorkPreviewOptions): Promise<void> }
  | { kind: 'independent'; message?: string };

export function resolveManualWorkRoute(app: App, mode: ImportMode): ManualWorkRoute {
  const route = resolveImportRoute(app, mode);
  if (route.kind === 'independent') return route;
  if (route.kind === 'core') {
    const intake = route.intake;
    const open = intake.openManualWork;
    if (intake.manualWorkApiVersion === 1 && typeof open === 'function') {
      return { kind: 'core', openPreview: (draft, options) => open.call(intake, draft, options) };
    }
    return { kind: 'independent', message: '当前 Media Core 版本尚不支持插件间手动建档。可升级 Media Core，或明确确认独立保存。' };
  }
  return { kind: 'independent', message: 'Media Core 当前不可用。可启用兼容版本，或明确确认独立保存。' };
}

export function resolveImportRoute(app: App, mode: ImportMode): ImportRoute {
  if (mode === 'independent') return { kind: 'independent' };
  // Obsidian exposes the installed and loaded plugin registries at runtime, outside its public types.
  const registry = (app as App & { plugins?: PluginRegistry }).plugins;
  const plugin = registry?.getPlugin?.(CORE_ID);
  const enabled = registry?.enabledPlugins?.has(CORE_ID);
  if (plugin && enabled !== false) {
    const intake = plugin.sourceIntake;
    if (intake?.apiVersion === 1 && intake.sourceSchema === SOURCE_V2_PROTOCOL && typeof intake.openSourcePreview === 'function') {
      return { kind: 'core', intake: intake as SourceIntake };
    }
    return { kind: 'unavailable', message: 'Media Core 尚未就绪，或当前版本不支持一键导入。可以复制规范来源 JSON，在 Media Core 中手动预览。' };
  }
  if (plugin || registry?.manifests?.[CORE_ID] || enabled) {
    return { kind: 'unavailable', message: enabled === false
      ? 'Media Core 已停用。启用后重试，或复制规范来源 JSON。'
      : 'Media Core 尚未加载。请稍后重试，或复制规范来源 JSON。' };
  }
  if (!registry?.manifests || !registry.getPlugin) {
    return { kind: 'unavailable', message: '无法确认 Media Core 安装状态。可复制规范来源 JSON，或在设置中明确选择独立模式。' };
  }
  return mode === 'auto'
    ? { kind: 'independent' }
    : { kind: 'unavailable', message: '当前 Vault 尚未安装 Media Core。可复制规范来源 JSON。' };
}

export async function openMediaCorePreview(
  app: App, mode: ImportMode, source: Record<string, unknown>, targetUid?: string,
): Promise<void> {
  const route = resolveImportRoute(app, mode);
  if (route.kind === 'unavailable') throw new Error(route.message);
  if (route.kind !== 'core') throw new Error('当前设置使用独立模式。');
  if (source.protocol !== route.intake.sourceSchema) throw new Error('Media Core 不支持此来源协议。');
  await route.intake.openSourcePreview(source, targetUid ? { targetUid } : undefined);
}

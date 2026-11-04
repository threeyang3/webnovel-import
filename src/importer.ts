import { matchesWork } from './matching';
import { providerName, getSourceAdapter } from './sources';
import { App, TFile, normalizePath, requestUrl, stringifyYaml } from 'obsidian';
import { getSources, isCoreManaged, upsertFrontmatter } from './merge';
import { parseBookUrl, parseSourceHtml } from './sources';
import { BookRef, ImportSettings, SourceMetadata, sourceKey } from './types';

export interface ImportResult {
  file: TFile;
  created: boolean;
  adopted: string[];
  preserved: string[];
  warnings: string[];
}

export function folderPath(value: string): string {
  const path = value.trim().replace(/\\/g, '/');
  if (path.startsWith('/') || /[:*?"<>|\u0000-\u001f]/.test(path) || path.split('/').some(p => p === '..' || p === '.')) {
    throw new Error('请填写 Vault 内的相对目录，例如 网文 或 _assets/webnovel-import。');
  }
  return path ? normalizePath(path) : '';
}

function fileStem(value: string): string {
  const stem = Array.from(value.replace(/[\\/:*?"<>|\u0000-\u001f#^[\]]/g, ' ').trim()).slice(0, 100).join('').replace(/[. ]+$/, '');
  return stem || '未命名作品';
}

function hash(value: string): string {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return (result >>> 0).toString(16);
}

function markdownText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_[\]#]/g, '\\$&');
}

export class Importer {
  private queue: Promise<unknown> = Promise.resolve();
  private recent = new Map<string, TFile>();

  constructor(private app: App, private settings: () => ImportSettings) {}

  async fetch(input: string): Promise<SourceMetadata> {
    const ref = parseBookUrl(input);
    const response = await requestUrl({ url: ref.url, headers: { Accept: 'text/html' }, throw: false });
    if (response.status !== 200) {
      const recovery = getSourceAdapter(ref.provider).recoveryHint;
      throw new Error(`${providerName(ref.provider)}返回 HTTP ${response.status}，未获得可解析的作品页。${recovery}`);
    }
    return parseSourceHtml(response.text, ref, 'remote');
  }

  import(metadata: SourceMetadata, target?: TFile, options: { createSeparate?: boolean } = {}): Promise<ImportResult> {
    const next = this.queue.then(() => this.write(metadata, target, options.createSeparate));
    this.queue = next.catch(() => undefined);
    return next;
  }

  sources(file: TFile): SourceMetadata[] {
    return getSources(this.app.metadataCache.getFileCache(file)?.frontmatter ?? {});
  }

  /** Exact source ownership takes precedence over title/author candidates. */
  previewMatches(metadata: SourceMetadata): { exact?: TFile; candidates: TFile[]; warnings: string[] } {
    const warnings: string[] = [];
    const exact = this.findMatches(metadata, warnings);
    if (exact.length > 1) throw new Error(`同一来源已关联多个文件，请先整理：${exact.map(f => f.path).join('；')}`);
    if (exact[0]) return { exact: exact[0], candidates: [], warnings };
    const candidates = this.app.vault.getMarkdownFiles().filter(file => {
      const local = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!local || !matchesWork(local, metadata)) return false;
      try { this.sources(file); return true; }
      catch { return false; } // Invalid plugin state cannot be an association target.
    }).sort((a, b) => a.path.localeCompare(b.path));
    return { candidates, warnings };
  }

  private findMatches(ref: BookRef, warnings: string[]): TFile[] {
    const key = sourceKey(ref);
    const matches = new Set<TFile>();
    const recent = this.recent.get(key);
    if (recent && this.app.vault.getAbstractFileByPath(recent.path) === recent) matches.add(recent);
    for (const file of this.app.vault.getMarkdownFiles()) {
      try {
        if (this.sources(file).some(s => sourceKey(s) === key)) matches.add(file);
      } catch {
        const state = this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        const rawSources = state && typeof state === 'object' ? state.sources : undefined;
        if (Array.isArray(rawSources) && rawSources.some(s => s?.provider === ref.provider && s?.id === ref.id)) {
          if (isCoreManaged(state)) throw new Error(`${file.path} 已由 Media Core 托管。请把采集结果导出到 Media Core。`);
          throw new Error(`${file.path} 已记录此来源，但插件数据格式不兼容或有误；请先检查该文件。`);
        }
        if (!isCoreManaged(state)) warnings.push(`${file.path} 的来源区格式不兼容，未参与本次自动去重检查。`);
      }
    }
    return [...matches];
  }

  private async ensureFolder(path: string): Promise<void> {
    if (!path) return;
    let partial = '';
    for (const segment of path.split('/')) {
      partial = partial ? `${partial}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(partial);
      if (existing instanceof TFile) throw new Error(`目录位置已有同名文件：${partial}`);
      if (!existing) await this.app.vault.createFolder(partial);
    }
  }

  private async cover(metadata: SourceMetadata, warnings: string[]): Promise<string | undefined> {
    if (!metadata.cover_url || !this.settings().downloadCovers) return metadata.cover_url;
    try {
      const response = await requestUrl({ url: metadata.cover_url, throw: false });
      const mime = Object.entries(response.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1].split(';')[0].trim().toLowerCase();
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' } as Record<string, string>)[mime ?? ''];
      if (response.status !== 200 || !ext) throw new Error('封面响应不是支持的图片');
      const folder = folderPath(this.settings().coverFolder);
      await this.ensureFolder(folder);
      const path = normalizePath(`${folder ? `${folder}/` : ''}${metadata.provider}-${metadata.id}-${hash(metadata.cover_url)}.${ext}`);
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (!existing) await this.app.vault.createBinary(path, response.arrayBuffer);
      else if (!(existing instanceof TFile)) throw new Error('封面位置被同名目录占用');
      return path;
    } catch (error) {
      warnings.push(`封面未下载，保留原始图片链接：${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  private async write(metadata: SourceMetadata, explicitTarget?: TFile, createSeparate = false): Promise<ImportResult> {
    if (!metadata.title.trim()) throw new Error('请填写作品标题。');
    if (explicitTarget && this.app.vault.getAbstractFileByPath(explicitTarget.path) !== explicitTarget) {
      throw new Error('目标笔记已移动或删除，请重新选择。');
    }
    const plan = this.previewMatches(metadata);
    const warnings = [...metadata.warnings, ...plan.warnings];
    const matches = plan.exact ? [plan.exact] : [];
    if (explicitTarget && matches[0] && matches[0] !== explicitTarget) {
      throw new Error(`此来源已经关联 ${matches[0].path}，本次未改动其他文件。`);
    }
    const target = explicitTarget ?? matches[0];
    if (!target && plan.candidates.length && !createSeparate) {
      throw new Error(`发现书名与作者匹配的已有作品，请单独预览并选择关联或独立创建：${plan.candidates.map(f => f.path).join('；')}`);
    }
    if (target && isCoreManaged(this.app.metadataCache.getFileCache(target)?.frontmatter?.webnovel_import)) {
      throw new Error('此作品的来源由 Media Core 托管，请把采集结果导出到 Media Core。');
    }
    const cover = await this.cover(metadata, warnings);
    const options = { uid: `work-${crypto.randomUUID()}`, cover, summaryLength: this.settings().summaryLength };
    let adopted: string[] = [];
    let preserved: string[] = [];
    if (target) {
      await this.app.fileManager.processFrontMatter(target, frontmatter => {
        const localCover = typeof frontmatter.cover === 'string' && !/^https?:\/\//i.test(frontmatter.cover)
          && this.app.vault.getAbstractFileByPath(frontmatter.cover) instanceof TFile ? frontmatter.cover : undefined;
        const retainedCover = !cover && metadata.cover_url && localCover ? localCover : cover;
        const result = upsertFrontmatter(frontmatter, metadata, { ...options, cover: retainedCover });
        Object.assign(frontmatter, result.frontmatter);
        adopted = result.adopted;
        preserved = result.preserved;
      });
      this.recent.set(sourceKey(metadata), target);
      return { file: target, created: false, adopted, preserved, warnings };
    }

    const result = upsertFrontmatter({}, metadata, options);
    const folder = folderPath(this.settings().outputFolder);
    await this.ensureFolder(folder);
    const base = `${folder ? `${folder}/` : ''}${fileStem(metadata.title)}`;
    let path = `${base}.md`;
    if (this.app.vault.getAbstractFileByPath(path)) path = `${base} (${metadata.provider}-${metadata.id}).md`;
    for (let suffix = 2; this.app.vault.getAbstractFileByPath(path); suffix++) path = `${base} (${metadata.provider}-${metadata.id}-${suffix}).md`;
    const body = this.initialBody(result.frontmatter, metadata);
    const file = await this.app.vault.create(normalizePath(path), `---\n${stringifyYaml(result.frontmatter)}---\n\n${body}`);
    this.recent.set(sourceKey(metadata), file);
    return { file, created: true, adopted: result.adopted, preserved: result.preserved, warnings };
  }

  private initialBody(frontmatter: Record<string, unknown>, metadata: SourceMetadata): string {
    const lines = [`# ${markdownText(String(frontmatter.title))}`, ''];
    const cover = frontmatter.cover;
    if (typeof cover === 'string') {
      lines.push(/^https?:\/\//i.test(cover) ? `![封面](<${cover.replace(/>/g, '%3E')}>)` : `![[${cover}]]`, '');
    }
    if (frontmatter.summary) lines.push(markdownText(String(frontmatter.summary)), '');
    lines.push(`[作品详情 · ${providerName(metadata.provider)}](${metadata.url})`, '', '<!-- 正文由你维护；刷新仅更新属性中的来源信息和未被人工修改的采用值。 -->', '');
    return lines.join('\n');
  }
}

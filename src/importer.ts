import { hasNoAuthors, matchesTitle, matchesWork } from './matching';
import { providerName, getSourceAdapter } from './sources';
import { App, TFile, getFrontMatterInfo, normalizePath, parseYaml, requestUrl, stringifyYaml } from 'obsidian';
import { getSources, isCoreManaged, upsertFrontmatter } from './merge';
import { decodeHtmlBytes, parseBookUrl, parseSourceHtml } from './sources';
import { BookRef, ImportSettings, SourceMetadata, sourceKey } from './types';
import { isHttpUrl, manualFrontmatter, normalizeManualWork, type ManualWorkDraft } from './manual-work';

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
  private recentManual = new WeakMap<TFile, Record<string, unknown>>();

  constructor(private app: App, private settings: () => ImportSettings) {}

  async fetch(input: string): Promise<SourceMetadata> {
    const ref = parseBookUrl(input);
    const name = providerName(ref.provider);
    const recovery = getSourceAdapter(ref.provider).recoveryHint;
    const response = await requestUrl({ url: ref.url, headers: { Accept: 'text/html' }, throw: false }).catch((error: unknown) => {
      throw new Error(`未能连接${name}：${error instanceof Error ? error.message : String(error)}。${recovery}`);
    });
    if (response.status !== 200) {
      let reason = '未获得可解析的作品页';
      if ([404, 410].includes(response.status)) reason = '此链接的公开页面未找到或已移除，请核对链接';
      if ([202, 401, 403, 429].includes(response.status)) reason = '普通请求可能受访问限制';
      throw new Error(`${name}返回 HTTP ${response.status}，${reason}。${recovery}`);
    }
    const contentType = Object.entries(response.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
    const html = ref.provider === 'jjwxc' ? decodeHtmlBytes(response.arrayBuffer, contentType) : response.text;
    return parseSourceHtml(html, ref, 'remote');
  }

  import(metadata: SourceMetadata, target?: TFile, options: { createSeparate?: boolean } = {}): Promise<ImportResult> {
    return this.enqueue(() => this.write(metadata, target, options.createSeparate));
  }

  private enqueue<T>(write: () => Promise<T>): Promise<T> {
    const next = this.queue.then(write);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private cachedFrontmatter(file: TFile): Record<string, unknown> | undefined {
    const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (cached) this.recentManual.delete(file);
    return cached ?? this.recentManual.get(file);
  }

  prepareManual(draft: ManualWorkDraft): ManualWorkDraft {
    const result = normalizeManualWork(draft);
    if (!result.cover || isHttpUrl(result.cover)) return result;
    const path = folderPath(result.cover);
    if (!/\.(?:jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(path) ||
        !(this.app.vault.getAbstractFileByPath(path) instanceof TFile)) {
      throw new Error('封面请填写 Vault 内已存在的图片路径，或完整的 HTTP 或 HTTPS 图片地址。');
    }
    return { ...result, cover: path };
  }

  previewManualMatches(draft: ManualWorkDraft): TFile[] {
    const authors = draft.authors ?? [];
    return this.app.vault.getMarkdownFiles().filter(file => {
      const local = this.cachedFrontmatter(file);
      return local?.type === 'work' && local.media === 'webnovel' &&
        (matchesWork(local, { title: draft.title, authors }) ||
          ((hasNoAuthors(local.authors) || !authors.length) && matchesTitle(local.title, draft.title)));
    }).sort((a, b) => a.path.localeCompare(b.path));
  }

  async createManual(draft: ManualWorkDraft, options: { createSeparate?: boolean } = {}): Promise<TFile> {
    const prepared = this.prepareManual(draft);
    const { createSeparate } = options;
    return this.enqueue(async () => {
      if (this.previewManualMatches(prepared).length && !createSeparate) {
        throw new Error('发现可能已存在的作品，请选择打开已有作品或确认独立创建。');
      }
      const folder = folderPath(this.settings().outputFolder);
      await this.ensureFolder(folder);
      const base = `${folder ? `${folder}/` : ''}${fileStem(prepared.title)}`;
      let path = `${base}.md`;
      for (let suffix = 2; this.app.vault.getAbstractFileByPath(path); suffix++) path = `${base} (${suffix}).md`;
      path = normalizePath(path);
      const fm = manualFrontmatter(this.prepareManual(prepared), `work-${crypto.randomUUID()}`);
      const cover = typeof fm.cover === 'string' && !isHttpUrl(fm.cover)
        ? this.app.vault.getAbstractFileByPath(fm.cover) : undefined;
      const coverLink = cover instanceof TFile ? `!${this.app.fileManager.generateMarkdownLink(cover, path, undefined, '封面')}` : undefined;
      const file = await this.app.vault.create(path, `---\n${stringifyYaml(fm)}---\n\n${this.initialBody(fm, undefined, coverLink)}`);
      this.recentManual.set(file, fm);
      return file;
    });
  }

  sources(file: TFile): SourceMetadata[] {
    return getSources(this.cachedFrontmatter(file) ?? {});
  }

  /** Exact source ownership takes precedence over title/author candidates. */
  previewMatches(metadata: SourceMetadata): { exact?: TFile; candidates: TFile[]; warnings: string[] } {
    const warnings: string[] = [];
    const exact = this.findMatches(metadata, warnings);
    if (exact.length > 1) throw new Error(`同一来源已关联多个文件，请先整理：${exact.map(f => f.path).join('；')}`);
    if (exact[0]) return { exact: exact[0], candidates: [], warnings };
    const candidates = this.app.vault.getMarkdownFiles().filter(file => {
      const local = this.cachedFrontmatter(file);
      if (!local || !matchesTitle(local.title, metadata.title)) return false;
      try {
        const sources = getSources(local);
        // Authorless, sourceless webnovels can be selected after a title match.
        // A title match never binds a source or updates an existing Work on its own.
        return matchesWork(local, metadata) ||
          (local.type === 'work' && local.media === 'webnovel' && !sources.length && hasNoAuthors(local.authors));
      }
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
    if (explicitTarget && plan.exact && plan.exact !== explicitTarget) {
      throw new Error(`此来源已经关联 ${plan.exact.path}，本次未改动其他文件。`);
    }
    const target = explicitTarget ?? plan.exact;
    if (!target && plan.candidates.length && !createSeparate) {
      throw new Error(`发现可能已存在的作品，请单独预览并选择关联或独立创建：${plan.candidates.map(f => f.path).join('；')}`);
    }
    if (target) {
      // A handoff can update the note before Obsidian refreshes its metadata cache.
      if (typeof getFrontMatterInfo === 'function') {
        const current = getFrontMatterInfo(await this.app.vault.read(target));
        if (current.exists) getSources(parseYaml(current.frontmatter) ?? {});
      } else {
        this.sources(target); // Obsidian 1.5.0–1.5.6 do not expose getFrontMatterInfo.
      }
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

  private initialBody(frontmatter: Record<string, unknown>, metadata?: SourceMetadata, coverLink?: string): string {
    const lines = [`# ${markdownText(String(frontmatter.title))}`, ''];
    const cover = frontmatter.cover;
    if (typeof cover === 'string') {
      lines.push(coverLink ?? (/^https?:\/\//i.test(cover) ? `![封面](<${cover.replace(/>/g, '%3E')}>)` : `![[${cover}]]`), '');
    }
    if (frontmatter.summary) lines.push(markdownText(String(frontmatter.summary)), '');
    if (metadata) lines.push(`[作品详情 · ${providerName(metadata.provider)}](${metadata.url})`, '');
    lines.push('<!-- 正文由你维护；刷新仅更新属性中的来源信息和未被人工修改的采用值。 -->', '');
    return lines.join('\n');
  }
}

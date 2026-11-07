import { providerName } from './sources';
import { Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Importer, folderPath } from './importer';
import { DEFAULT_SETTINGS, ImportSettings, ImportMode } from './types';
import { ArchiveExportModal, BatchImportModal, SingleImportModal } from './ui';
import { isCoreManaged } from './merge';
import { makeBookmarklet, parseCapturePayload } from './browser-capture';
import { parseBookUrl } from './sources';
import { sourceKey } from './types';
import { openMediaCorePreview, resolveImportRoute } from './media-core-integration';
import { ManualWorkModal } from './manual-ui';
import { SearchModal } from './search-ui';

export default class WebnovelPlugin extends Plugin {
  settings: ImportSettings = { ...DEFAULT_SETTINGS };
  importer!: Importer;
  searchKeyword = '';
  private browserTarget?: { key: string; file?: TFile };

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.importer = new Importer(this.app, () => this.settings);
    this.addCommand({ id: 'search-works', name: '搜索网文作品', callback: () => new SearchModal(this).open() });
    this.addCommand({ id: 'import-book', name: '从链接导入网文作品', callback: () => new SingleImportModal(this).open() });
    this.addCommand({ id: 'manual-work', name: '手动添加网文作品', callback: () => new ManualWorkModal(this).open() });
    this.addCommand({ id: 'import-links', name: '批量导入网文作品链接', callback: () => new BatchImportModal(this).open() });
    this.addCommand({ id: 'import-browser-capture', name: '从浏览器采集结果导入', callback: () => void this.receiveBrowserCapture() });
    this.registerObsidianProtocolHandler('webnovel-import', params => {
      if (params.vault && params.vault !== this.app.vault.getName()) {
        new Notice(`此采集书签对应 Vault「${params.vault}」。请切换到对应 Vault，或在当前 Vault 重新复制书签。`, 10000);
        return;
      }
      if (params.clipboard === '1') void this.receiveBrowserCapture({
        provider: params.provider, id: params.id, capturedAt: params.capturedAt,
      });
    });
    this.addCommand({
      id: 'attach-source', name: '给当前作品关联正式网文来源',
      checkCallback: checking => {
        const file = this.activeMarkdown();
        if (!file) return false;
        if (!checking) new SingleImportModal(this, file).open();
        return true;
      },
    });
    this.addCommand({
      id: 'refresh-current', name: '刷新当前网文的来源资料',
      checkCallback: checking => {
        const file = this.activeMarkdown();
        if (!file || this.importRoute().kind !== 'independent') return false;
        const state = this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        if (!state || isCoreManaged(state) || !Array.isArray(state.sources) || !state.sources.length) return false;
        if (!checking) void this.refresh(file);
        return true;
      },
    });
    this.addCommand({
      id: 'export-current-to-media-core', name: '将当前网文交给 Media Core',
      checkCallback: checking => {
        const file = this.activeMarkdown();
        const state = file && this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        if (!file || state?.schema_version !== 1 || !Array.isArray(state.sources) || !state.sources.length) return false;
        if (!checking) new ArchiveExportModal(this, file).open();
        return true;
      },
    });
    this.addSettingTab(new WebnovelSettings(this));
  }

  private activeMarkdown(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === 'md' ? file : null;
  }

  importRoute() { return resolveImportRoute(this.app, this.settings.importMode); }

  async openCorePreview(source: Record<string, unknown>, target?: TFile, mode = this.settings.importMode): Promise<void> {
    let targetUid: string | undefined;
    if (target) {
      if (this.app.vault.getAbstractFileByPath(target.path) !== target) throw new Error('目标笔记已不存在。');
      const uid: unknown = this.app.metadataCache.getFileCache(target)?.frontmatter?.uid;
      if (typeof uid !== 'string' || !uid.trim()) throw new Error('当前笔记缺少可用的作品 UID，无法在 Media Core 中指定该笔记。');
      targetUid = uid;
    }
    await openMediaCorePreview(this.app, mode, source, targetUid);
  }

  openSourcePage(input: string, target?: TFile): void {
    const ref = parseBookUrl(input);
    this.browserTarget = { key: sourceKey(ref), file: target };
    window.open(ref.url, '_blank', 'noopener,noreferrer');
  }

  async copyCaptureBookmarklet(): Promise<void> {
    try {
      await navigator.clipboard.writeText(makeBookmarklet(this.app.vault.getName()));
      new Notice('已复制“采集当前网文作品”。请粘贴到浏览器书签的网址栏，并保留开头的 javascript:。', 10000);
    } catch (error) {
      new Notice(`复制失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async receiveBrowserCapture(expected?: { provider: string; id: string; capturedAt?: string }): Promise<void> {
    try {
      const metadata = parseCapturePayload(await navigator.clipboard.readText(), expected);
      const pending = this.browserTarget;
      const target = pending?.key === sourceKey(metadata) ? pending.file : undefined;
      if (target && this.app.vault.getAbstractFileByPath(target.path) !== target) {
        throw new Error('原先选定的目标笔记已经移动或删除，请重新打开关联来源入口。');
      }
      // Always preview first. A browser URI never writes a note or downloads a cover itself.
      new SingleImportModal(this, target, { metadata, onAccepted: () => {
        if (pending?.key === sourceKey(metadata) && this.browserTarget === pending) this.browserTarget = undefined;
      } }).open();
    } catch (error) {
      new Notice(`浏览器采集导入失败：${error instanceof Error ? error.message : String(error)}\n可从作品链接导入弹窗选择已保存的 HTML。`, 10000);
    }
  }

  private async refresh(file: TFile): Promise<void> {
    let sources;
    try { sources = this.importer.sources(file); }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error), 10000); return; }
    let recoveryUrl: string | undefined;
    for (const source of sources) {
      try {
        if (this.importRoute().kind !== 'independent') throw new Error('当前模式已切换，请通过单条预览交给 Media Core。');
        const metadata = await this.importer.fetch(source.url);
        if (this.importRoute().kind !== 'independent') throw new Error('当前模式已切换，请通过单条预览交给 Media Core。');
        const result = await this.importer.import(metadata, file);
        new Notice(`${providerName(source.provider)}已刷新：采用 ${result.adopted.length} 项，保留 ${result.preserved.length} 项人工/其他来源值。${result.warnings.length ? `\n${result.warnings.join('\n')}` : ''}`, 8000);
      } catch (error) {
        recoveryUrl ??= source.url;
        new Notice(`${providerName(source.provider)}刷新失败：${error instanceof Error ? error.message : String(error)}`, 10000);
      }
    }
    if (recoveryUrl) new SingleImportModal(this, file, { url: recoveryUrl }).open();
  }

  async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}

class WebnovelSettings extends PluginSettingTab {
  constructor(private plugin: WebnovelPlugin) { super(plugin.app, plugin); }

  display(): void {
    this.containerEl.empty();
    this.containerEl.createEl('h2', { text: 'Webnovel Import' });
    this.containerEl.createEl('p', { text: `作品元数据导入器 · ${this.plugin.manifest.version} 开发预览。支持起点、番茄、七猫与晋江的搜索和作品采集。` });
    new Setting(this.containerEl).setName('导入模式')
      .setDesc('自动模式优先使用 Media Core；确认未安装时才独立保存。已安装但不可用时，可以复制规范来源 JSON 或在这里明确切换模式。')
      .addDropdown(dropdown => dropdown.addOptions({ auto: '自动', 'media-core': 'Media Core', independent: '独立' })
        .setValue(this.plugin.settings.importMode).onChange(async value => {
          this.plugin.settings.importMode = value as ImportMode;
          await this.plugin.saveSettings();
        }));
    new Setting(this.containerEl).setName('采集当前网文作品')
      .setDesc('把复制的内容用作浏览器书签的网址。打开起点、七猫或晋江作品详情页后点击书签，资料通过本机剪贴板返回当前 Vault 的预览。番茄可用作品链接获取。')
      .addButton(button => button.setButtonText('复制采集书签').onClick(() => void this.plugin.copyCaptureBookmarklet()));
    new Setting(this.containerEl).setName('新作品目录').setDesc('相对于当前 Vault。既有文件保持原路径。').addText(text => text.setValue(this.plugin.settings.outputFolder).onChange(async value => {
      try { this.plugin.settings.outputFolder = folderPath(value); await this.plugin.saveSettings(); }
      catch { /* Keep the last valid setting while the path is being typed. */ }
    }));
    new Setting(this.containerEl).setName('下载封面').setDesc('成功后保存在 Vault；下载失败保留原始封面链接。').addToggle(toggle => toggle.setValue(this.plugin.settings.downloadCovers).onChange(async value => {
      this.plugin.settings.downloadCovers = value; await this.plugin.saveSettings();
    }));
    new Setting(this.containerEl).setName('封面目录').addText(text => text.setValue(this.plugin.settings.coverFolder).onChange(async value => {
      try { this.plugin.settings.coverFolder = folderPath(value); await this.plugin.saveSettings(); }
      catch { /* Keep the last valid setting while the path is being typed. */ }
    }));
    new Setting(this.containerEl).setName('本地简介长度').setDesc('来源简介另存于来源区；人工修改后的本地简介受保护。').addSlider(slider => slider.setLimits(80, 600, 20).setValue(this.plugin.settings.summaryLength).setDynamicTooltip().onChange(async value => {
      this.plugin.settings.summaryLength = value; await this.plugin.saveSettings();
    }));
    this.containerEl.createEl('p', { text: '个人评分、阅读状态、进度、简评、随记和系列关系由你维护。刷新不改写正文，也不以作品标题自动合并不同来源。', cls: 'setting-item-description' });
  }
}

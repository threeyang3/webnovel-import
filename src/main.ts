import { providerName } from './sources';
import { Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Importer, folderPath } from './importer';
import { DEFAULT_SETTINGS, ImportSettings } from './types';
import { ArchiveExportModal, BatchImportModal, SingleImportModal } from './ui';
import { isCoreManaged } from './merge';
import { makeBookmarklet, parseCapturePayload } from './browser-capture';
import { parseBookUrl } from './sources';
import { sourceKey } from './types';

export default class WebnovelPlugin extends Plugin {
  settings: ImportSettings = { ...DEFAULT_SETTINGS };
  importer!: Importer;
  private browserTarget?: { key: string; file?: TFile };

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.importer = new Importer(this.app, () => this.settings);
    this.addCommand({ id: 'import-book', name: '从作品链接导入网文', callback: () => new SingleImportModal(this).open() });
    this.addCommand({ id: 'import-links', name: '批量导入网文作品链接', callback: () => new BatchImportModal(this).open() });
    this.addCommand({ id: 'import-browser-capture', name: '从浏览器采集结果导入', callback: () => void this.receiveBrowserCapture() });
    this.registerObsidianProtocolHandler('webnovel-import', params => {
      if (params.vault && params.vault !== this.app.vault.getName()) return;
      if (params.clipboard === '1') void this.receiveBrowserCapture({ provider: params.provider, id: params.id });
    });
    this.addCommand({
      id: 'attach-source', name: '给当前作品关联起点或番茄来源',
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
        if (!file) return false;
        const state = this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import;
        if (!state || isCoreManaged(state)) return false;
        if (!checking) void this.refresh(file);
        return true;
      },
    });
    this.addCommand({
      id: 'export-current-to-media-core', name: '导出当前网文来源给 Media Core',
      checkCallback: checking => {
        const file = this.activeMarkdown();
        if (!file || this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import?.schema_version !== 1) return false;
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

  openSourcePage(input: string, target?: TFile): void {
    const ref = parseBookUrl(input);
    this.browserTarget = { key: sourceKey(ref), file: target };
    window.open(ref.url, '_blank', 'noopener,noreferrer');
  }

  private async receiveBrowserCapture(expected?: { provider: string; id: string }): Promise<void> {
    try {
      const metadata = parseCapturePayload(await navigator.clipboard.readText());
      if (expected && (metadata.provider !== expected.provider || metadata.id !== expected.id)) {
        throw new Error('剪贴板内容与刚采集的作品不一致，请重新点击该作品的采集书签。');
      }
      const pending = this.browserTarget;
      const target = pending?.key === sourceKey(metadata) ? pending.file : undefined;
      if (target && this.app.vault.getAbstractFileByPath(target.path) !== target) {
        throw new Error('原先选定的目标笔记已经移动或删除，请重新打开关联来源入口。');
      }
      // Always preview first. A browser URI never writes a note or downloads a cover itself.
      new SingleImportModal(this, target, { metadata, onSaved: () => {
        if (pending?.key === sourceKey(metadata) && this.browserTarget === pending) this.browserTarget = undefined;
      } }).open();
    } catch (error) {
      new Notice(`浏览器采集导入失败：${error instanceof Error ? error.message : String(error)}`, 10000);
    }
  }

  private async refresh(file: TFile): Promise<void> {
    let sources;
    try { sources = this.importer.sources(file); }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error), 10000); return; }
    let recoveryUrl: string | undefined;
    for (const source of sources) {
      try {
        const metadata = await this.importer.fetch(source.url);
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
    this.containerEl.createEl('p', { text: '作品元数据导入器 · 0.1.1 开发预览。起点支持浏览器页面采集；普通 HTTP 获取仍可能遇到验证页。' });
    new Setting(this.containerEl).setName('起点浏览器采集书签')
      .setDesc('复制后，在浏览器新建书签，把内容粘贴到书签的网址栏。正常打开起点作品页后点击书签，即可把资料带回当前 Vault 的导入预览。只读取作品资料，通过本机剪贴板传递。')
      .addButton(button => button.setButtonText('复制采集书签').onClick(async () => {
        try {
          await navigator.clipboard.writeText(makeBookmarklet(this.plugin.app.vault.getName()));
          new Notice('已复制。请将其粘贴到浏览器书签的网址栏，并保留开头的 javascript:。', 10000);
        } catch (error) { new Notice(`复制失败：${error instanceof Error ? error.message : String(error)}`); }
      }));
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

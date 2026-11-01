import { Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { Importer, folderPath } from './importer';
import { DEFAULT_SETTINGS, ImportSettings, providerName } from './types';
import { BatchImportModal, SingleImportModal } from './ui';

export default class WebnovelPlugin extends Plugin {
  settings: ImportSettings = { ...DEFAULT_SETTINGS };
  importer!: Importer;

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.importer = new Importer(this.app, () => this.settings);
    this.addCommand({ id: 'import-book', name: '从作品链接导入网文', callback: () => new SingleImportModal(this).open() });
    this.addCommand({ id: 'import-links', name: '批量导入网文作品链接', callback: () => new BatchImportModal(this).open() });
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
        if (!file || !this.app.metadataCache.getFileCache(file)?.frontmatter?.webnovel_import) return false;
        if (!checking) void this.refresh(file);
        return true;
      },
    });
    this.addSettingTab(new WebnovelSettings(this));
  }

  private activeMarkdown(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    return file?.extension === 'md' ? file : null;
  }

  private async refresh(file: TFile): Promise<void> {
    let sources;
    try { sources = this.importer.sources(file); }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error), 10000); return; }
    for (const source of sources) {
      try {
        const metadata = await this.importer.fetch(source.url);
        const result = await this.importer.import(metadata, file);
        new Notice(`${providerName(source.provider)}已刷新：采用 ${result.adopted.length} 项，保留 ${result.preserved.length} 项人工/其他来源值。${result.warnings.length ? `\n${result.warnings.join('\n')}` : ''}`, 8000);
      } catch (error) {
        new Notice(`${providerName(source.provider)}刷新失败：${error instanceof Error ? error.message : String(error)}`, 10000);
      }
    }
  }

  async saveSettings(): Promise<void> { await this.saveData(this.settings); }
}

class WebnovelSettings extends PluginSettingTab {
  constructor(private plugin: WebnovelPlugin) { super(plugin.app, plugin); }

  display(): void {
    this.containerEl.empty();
    this.containerEl.createEl('h2', { text: 'Webnovel Import' });
    this.containerEl.createEl('p', { text: '作品元数据导入器 · 0.1.0 开发预览。起点自动获取待真实环境验证；缺失年份保持空值。' });
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

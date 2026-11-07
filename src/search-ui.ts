import { Modal, Setting } from 'obsidian';
import type WebnovelPlugin from './main';
import { searchProviders, type SearchProvider } from './search';
import { ManualWorkModal } from './manual-ui';
import { SingleImportModal } from './ui';

export class SearchModal extends Modal {
  constructor(private plugin: WebnovelPlugin) { super(plugin.app); }

  onOpen(): void {
    this.contentEl.addClass('webnovel-import-modal');
    this.contentEl.createEl('h2', { text: '搜索网文作品' });
    this.contentEl.createEl('p', { text: '输入书名或作者，在 Obsidian 里打开官网搜索。点进作品即可预览导入。' });
    new Setting(this.contentEl).setName('关键词').addText(text => {
      text.setPlaceholder('输入书名或作者').setValue(this.plugin.searchKeyword)
        .onChange(value => { this.plugin.searchKeyword = value; });
      text.inputEl.setAttribute('aria-label', '搜索关键词');
    });
    const platformFilter = new Setting(this.contentEl).setName('平台');
    const entries = this.contentEl.createDiv();
    const status = this.contentEl.createEl('p', { cls: 'webnovel-status', attr: { role: 'status' } });
    const render = (filter: string): void => {
      entries.empty();
      for (const provider of Object.keys(searchProviders) as SearchProvider[]) {
        if (filter && filter !== provider) continue;
        const site = searchProviders[provider];
        new Setting(entries).setName(site.name).setDesc(site.hint).addButton(button => {
          button.setButtonText('在 Obsidian 搜索').onClick(() => {
            const keyword = this.plugin.searchKeyword.trim();
            if (!keyword) {
              status.setText('请输入书名或作者关键词。');
              return;
            }
            this.close();
            this.plugin.openSearchBrowser(provider, keyword);
          });
        });
      }
    };
    platformFilter.addDropdown(dropdown => {
      dropdown.addOption('', '全部平台');
      for (const [provider, site] of Object.entries(searchProviders)) dropdown.addOption(provider, site.name);
      dropdown.selectEl.setAttribute('aria-label', '搜索平台');
      dropdown.onChange(render);
    });
    render('');
    new Setting(this.contentEl).setName('已有作品链接？')
      .addButton(button => button.setButtonText('从链接导入').onClick(() => {
        this.close();
        new SingleImportModal(this.plugin).open();
      }));
    new Setting(this.contentEl).setName('找不到作品？')
      .setDesc('只有书名也可以先建档，以后找到正式来源时再关联。')
      .addButton(button => button.setButtonText('手动添加作品').setCta().onClick(() => {
        this.close();
        new ManualWorkModal(this.plugin, this.plugin.searchKeyword.trim()).open();
      }));
  }

  onClose(): void { this.contentEl.empty(); }
}

import { Modal, Setting } from 'obsidian';
import type WebnovelPlugin from './main';
import { officialSearch, searchProviders, type SearchProvider } from './search';
import { ManualWorkModal } from './manual-ui';
import { SingleImportModal } from './ui';

export class SearchModal extends Modal {
  constructor(private plugin: WebnovelPlugin) { super(plugin.app); }

  onOpen(): void {
    this.contentEl.addClass('webnovel-import-modal');
    this.contentEl.createEl('h2', { text: '搜索网文作品' });
    this.contentEl.createEl('p', { text: '输入书名或作者，按需打开一个平台的官网搜索。找到作品后进入详情页采集。' });
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
          button.setButtonText(provider === 'jjwxc' ? '复制关键词并打开' : '打开搜索').onClick(async () => {
            try {
              const search = officialSearch(provider, this.plugin.searchKeyword);
              let guidance = '请在官网打开目标作品的详情页。';
              if (search.copyKeyword !== undefined) {
                try {
                  await navigator.clipboard.writeText(search.copyKeyword);
                  guidance = '已复制关键词，请在官网搜索框粘贴。';
                } catch {
                  guidance = '无法访问剪贴板，请从关键词输入框复制，再到官网搜索。';
                }
              }
              window.open(search.url, '_blank', 'noopener,noreferrer');
              status.setText(guidance);
            } catch (error) {
              status.setText(error instanceof Error ? error.message : String(error));
            }
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
    new Setting(this.contentEl).setName('找到作品后')
      .setDesc('起点、七猫和晋江详情页可使用采集书签直接返回。番茄可从详情页链接获取，四站均可尝试解析已保存的作品页 HTML。')
      .addButton(button => button.setButtonText('复制采集书签').onClick(() => void this.plugin.copyCaptureBookmarklet()))
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

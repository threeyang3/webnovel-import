import { ButtonComponent, Modal, Notice, Setting, type TFile } from 'obsidian';
import type WebnovelPlugin from './main';
import { resolveManualWorkRoute } from './media-core-integration';
import type { ManualWorkDraft } from './manual-work';

const names = (value: string): string[] => value.split(/[,，、]/).map(name => name.trim()).filter(Boolean);

export class ManualWorkModal extends Modal {
  private draft: ManualWorkDraft;
  private publication = '';
  private submitting = false;

  constructor(private plugin: WebnovelPlugin, title = '') {
    super(plugin.app);
    this.draft = { title };
  }

  onOpen(): void {
    const form = this.contentEl;
    form.addClass('webnovel-import-modal');
    form.createEl('h2', { text: '手动添加网文作品' });
    form.createEl('p', { text: '只需填写书名。日后找到可信的作品资料，可以为这条 Work 补充来源。' });
    let updateMatches = () => {};
    new Setting(form).setName('书名').addText(text => {
      text.setValue(this.draft.title).onChange(value => { this.draft.title = value; updateMatches(); });
      text.inputEl.required = true;
      text.inputEl.setAttribute('aria-label', '书名');
    });
    new Setting(form).setName('作者').setDesc('多位作者用逗号分隔。').addText(text =>
      text.setValue(this.draft.authors?.join('，') ?? '').onChange(value => { this.draft.authors = names(value); updateMatches(); }));
    new Setting(form).setName('简介').addTextArea(text => {
      text.setValue(this.draft.summary ?? '').onChange(value => { this.draft.summary = value; });
      text.inputEl.rows = 4;
    });
    new Setting(form).setName('封面').setDesc('可填 Vault 内图片路径或 HTTP(S) 图片链接。').addText(text =>
      text.setValue(this.draft.cover ?? '').onChange(value => { this.draft.cover = value; }));
    new Setting(form).setName('首发年份或日期').addText(text =>
      text.setValue(this.publication).setPlaceholder('YYYY 或 YYYY-MM-DD').onChange(value => { this.publication = value.trim(); }));
    new Setting(form).setName('原作状态').addDropdown(dropdown =>
      dropdown.addOptions({ '': '留空', ongoing: '连载中', completed: '已完结', paused: '暂停', unknown: '未知' })
        .setValue(this.draft.serialization_status ?? '').onChange(value => {
          this.draft.serialization_status = (value || undefined) as ManualWorkDraft['serialization_status'];
        }));
    new Setting(form).setName('字数').addText(text =>
      text.setValue(this.draft.word_count_text ?? '').setPlaceholder('例如 120 万字').onChange(value => { this.draft.word_count_text = value; }));
    new Setting(form).setName('分类').setDesc('多项用逗号分隔。').addText(text =>
      text.setValue(this.draft.tags?.join('，') ?? '').onChange(value => { this.draft.tags = names(value); }));
    const reference = this.draft.reference ??= {};
    const details = form.createEl('details');
    details.createEl('summary', { text: '历史平台、链接和资料备注' });
    details.createEl('p', { text: '历史资料仅作本地参考，可以保留已失效的链接。', cls: 'setting-item-description' });
    new Setting(details).setName('历史发布平台').addText(text =>
      text.setValue(reference.platform ?? '').onChange(value => { reference.platform = value; }));
    new Setting(details).setName('历史作品链接').addText(text =>
      text.setValue(reference.url ?? '').onChange(value => { reference.url = value; }));
    new Setting(details).setName('资料出处或备注').addTextArea(text =>
      text.setValue(reference.note ?? '').onChange(value => { reference.note = value; }));

    const actions = form.createDiv();
    const status = form.createEl('p', { cls: 'webnovel-status', attr: { role: 'status' } });
    const routeNow = () => resolveManualWorkRoute(this.app, this.plugin.settings.importMode);
    const renderActions = () => {
      actions.empty();
      const route = routeNow();
      const description = route.kind === 'core'
        ? '在 Media Core 中检查已有作品和待保存字段，然后确认。'
        : route.message ?? '在当前 Vault 中创建独立 Markdown Work。';
      actions.createEl('p', { text: description, cls: 'setting-item-description' });
      const matches = actions.createDiv({ cls: 'webnovel-matches' });
      let candidates: TFile[] = [];
      let selected = '';
      let submit!: ButtonComponent;
      const updateSubmit = () => {
        submit.setDisabled(this.submitting || (candidates.length > 0 && !selected));
        submit.setButtonText(route.kind === 'core' ? '在 Media Core 预览'
          : selected && selected !== 'new' ? '打开已有作品' : '确认创建独立作品');
      };
      new Setting(actions).addButton(button => {
        submit = button.setCta().onClick(async () => {
          if (this.submitting) return;
          const current = routeNow();
          if (current.kind !== route.kind || (current.kind === 'independent' && route.kind === 'independent' && current.message !== route.message)) {
            status.setText('Media Core 的可用状态已变化，请核对保存方式。');
            renderActions();
            return;
          }
          this.submitting = true;
          updateSubmit();
          try {
            if (current.kind === 'independent' && selected && selected !== 'new') {
              const existing = candidates[Number(selected)];
              if (this.app.vault.getAbstractFileByPath(existing.path) !== existing) throw new Error('选中的作品已移动或删除，请重新选择。');
              await this.app.workspace.getLeaf(false).openFile(existing);
            } else {
              const draft = this.readDraft();
              if (current.kind === 'core') {
                await current.openPreview(draft, { onAccepted: () => this.close() });
                return;
              } else {
                const file = await this.plugin.importer.createManual(draft, { createSeparate: selected === 'new' });
                new Notice(`已创建：${file.basename}`);
                await this.app.workspace.getLeaf(false).openFile(file);
              }
            }
            this.close();
          } catch (error) {
            status.setText(error instanceof Error ? error.message : String(error));
            updateMatches();
          } finally {
            this.submitting = false;
            updateSubmit();
          }
        });
      });
      updateMatches = () => {
        matches.empty();
        selected = '';
        candidates = route.kind === 'independent' ? this.plugin.importer.previewManualMatches(this.draft) : [];
        if (candidates.length) {
          new Setting(matches).setName('发现可能已存在的作品')
            .setDesc('可打开已有作品核对，或确认另建一条记录。打开已有作品时保留原字段和正文。')
            .addDropdown(dropdown => {
              dropdown.addOption('', '请选择');
              candidates.forEach((file, index) => dropdown.addOption(String(index), file.path));
              dropdown.addOption('new', '独立创建作品');
              dropdown.onChange(value => { selected = value; updateSubmit(); });
            });
        }
        updateSubmit();
      };
      updateMatches();
    };
    renderActions();
  }

  private readDraft(): ManualWorkDraft {
    const year = /^\d{4}$/.test(this.publication);
    return this.plugin.importer.prepareManual({
      ...this.draft,
      first_published_year: year ? Number(this.publication) : undefined,
      first_published_at: this.publication && !year ? this.publication : undefined,
    });
  }

  onClose(): void { this.contentEl.empty(); }
}

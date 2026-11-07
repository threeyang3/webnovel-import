import { providerName } from './sources';
import { ButtonComponent, Modal, Notice, Setting, TFile } from 'obsidian';
import type WebnovelPlugin from './main';
import { decodeHtmlBytes, parseBookUrl, parseSourceHtml } from './sources';
import { SourceMetadata, sourceKey } from './types';
import { toMediaCoreSource } from './media-core-export';
import { resolveImportRoute } from './media-core-integration';
import { isCoreManaged } from './merge';

async function copyMediaCoreSource(metadata: SourceMetadata, archive = false): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(toMediaCoreSource(metadata, { archive }), null, 2));
}

const copiedMessage = '已复制作品资料。请在 Media Core 的“导入来源资料”入口粘贴并预览。';
const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);

export class SingleImportModal extends Modal {
  private url = '';
  private html = '';
  private status!: HTMLElement;
  private form!: HTMLElement;
  private metadata?: SourceMetadata;
  private generation = 0;
  private submitting = false;
  private fallback?: HTMLDetailsElement;

  constructor(
    private plugin: WebnovelPlugin,
    private target?: TFile,
    private initial?: { url?: string; metadata?: SourceMetadata; onAccepted?: () => void },
  ) { super(plugin.app); }

  onOpen(): void {
    this.url = this.initial?.url ?? this.initial?.metadata?.url ?? '';
    this.metadata = this.initial?.metadata;
    this.contentEl.addClass('webnovel-import-modal');
    this.contentEl.createEl('h2', { text: this.target ? '关联网文来源' : '导入网文作品' });
    this.contentEl.createEl('p', { text: this.target ? `将来源关联到「${this.target.basename}」。已有人工内容会保留。` : '粘贴起点、番茄、七猫或晋江的作品详情页链接。获取后可补填缺失资料。' });
    new Setting(this.contentEl).setName('作品链接').addText(text => {
      text.setValue(this.url).setPlaceholder('https://fanqienovel.com/page/…').onChange(value => {
        this.url = value; this.generation++; this.metadata = undefined;
        this.form?.empty(); this.status?.setText('');
      });
      text.inputEl.addClass('webnovel-url-input');
    });
    const actions = new Setting(this.contentEl);
    actions.addButton(button => button.setButtonText('获取资料').setCta().onClick(() => void this.acquire(button, false)));
    actions.addButton(button => button.setButtonText('手动补填').onClick(() => {
      this.generation++;
      try {
        const ref = parseBookUrl(this.url);
        this.metadata = { ...ref, title: '', authors: [], fetched_at: new Date().toISOString(), acquisition: 'manual', evidence: {}, warnings: ['此条来源资料由用户补填，尚未通过页面获取验证。'] };
        this.status.setText('手动补填的值会作为人工内容保护。');
        this.renderForm();
      } catch (error) { this.status.setText(errorText(error)); }
    }));
    actions.addButton(button => button.setButtonText('打开作品页').onClick(() => {
      try { this.plugin.openSourcePage(this.url, this.target); }
      catch (error) { this.status.setText(errorText(error)); }
    }));
    const details = this.contentEl.createEl('details');
    this.fallback = details;
    details.createEl('summary', { text: '从正常打开的作品页面 HTML 解析' });
    details.createEl('p', { text: '先填写作品链接，在浏览器正常打开该作品并另存为 HTML，再选择文件或粘贴页面内容。插件只解析，不执行页面脚本。文件中的作品标识须与链接一致。' });
    details.createEl('p', { text: '也可在设置中复制浏览器采集书签。正常打开作品后点击书签，资料会复制到剪贴板并返回预览；未自动返回时，运行“从浏览器采集结果导入”。核对后再确认保存。' });
    const fileInput = details.createEl('input', { type: 'file', attr: { accept: '.html,.htm,text/html' } });
    fileInput.hidden = true;
    new Setting(details).addButton(button => button.setButtonText('选择 HTML 文件').onClick(() => fileInput.click()));
    const htmlArea = details.createEl('textarea', { cls: 'webnovel-html-input', attr: { placeholder: '<!doctype html>…', 'aria-label': '作品页 HTML' } });
    htmlArea.addEventListener('input', () => {
      this.html = htmlArea.value; this.generation++; this.metadata = undefined;
      this.form?.empty(); this.status?.setText('已填写 HTML，点击“解析 HTML”预览作品资料。');
    });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file) return;
      const generation = ++this.generation;
      this.form.empty(); this.metadata = undefined;
      details.open = true;
      this.status.setText('正在读取并解析 HTML 文件…');
      try {
        // Bind this file read to the URL selected when it started. Editing the URL
        // invalidates the generation, so the file cannot be applied to another book.
        const ref = parseBookUrl(this.url);
        const html = decodeHtmlBytes(await file.arrayBuffer());
        if (generation !== this.generation) return;
        this.html = html; htmlArea.value = html;
        this.metadata = parseSourceHtml(html, ref, 'html');
        this.status.setText(this.metadata.warnings.length ? this.metadata.warnings.join('；') : '已解析作品资料，请核对后导入。');
        this.renderForm();
      } catch (error) {
        if (generation === this.generation) this.status.setText(errorText(error));
      }
    });
    new Setting(details).addButton(button => button.setButtonText('解析 HTML').onClick(() => void this.acquire(button, true)));
    this.status = this.contentEl.createEl('p', { cls: 'webnovel-status', attr: { role: 'status' } });
    this.form = this.contentEl.createDiv();
    if (this.metadata) {
      this.status.setText(this.metadata.warnings.length ? this.metadata.warnings.join('；') : '已取得作品资料，请核对后导入。');
      this.renderForm();
    }
  }

  private async acquire(button: ButtonComponent, fromHtml: boolean): Promise<void> {
    const generation = ++this.generation;
    button.setDisabled(true);
    this.form.empty();
    this.metadata = undefined;
    this.status.setText(fromHtml ? '正在解析页面…' : '正在获取作品资料…');
    try {
      const metadata = fromHtml ? parseSourceHtml(this.html, parseBookUrl(this.url), 'html') : await this.plugin.importer.fetch(this.url);
      if (generation !== this.generation) return;
      this.metadata = metadata;
      this.status.setText(this.metadata.warnings.length ? this.metadata.warnings.join('；') : '已取得作品资料。');
      this.renderForm();
    } catch (error) {
      if (generation === this.generation) {
        this.status.setText(errorText(error));
        if (this.fallback) this.fallback.open = true;
      }
    }
    finally { button.setDisabled(false); }
  }

  private renderForm(): void {
    this.form.empty();
    const original = this.metadata;
    if (!original) return;
    const edited: SourceMetadata = structuredClone(original);
    this.form.createEl('h3', { text: `${providerName(original.provider)} · ${original.id}` });
    this.form.createEl('p', { text: '表单留空表示本次不采纳该字段；清除已有值请直接编辑作品属性。', cls: 'setting-item-description' });
    let updateMatches: (() => void) | undefined;
    const set = (key: keyof SourceMetadata, value: unknown): void => {
      (edited as unknown as Record<string, unknown>)[key] = value;
      if (JSON.stringify(value) !== JSON.stringify(original[key])) edited.evidence[key] = 'manual:用户补填或修改';
      else if (original.evidence[key]) edited.evidence[key] = original.evidence[key];
      else delete edited.evidence[key];
      if (key === 'title' || key === 'authors') updateMatches?.();
    };
    new Setting(this.form).setName('书名').addText(text => text.setValue(edited.title).onChange(value => set('title', value.trim())));
    new Setting(this.form).setName('作者').setDesc('多位作者用逗号分隔。').addText(text => text.setValue(edited.authors.join('，')).onChange(value => set('authors', value.split(/[,，]/).map(s => s.trim()).filter(Boolean))));
    new Setting(this.form).setName('来源简介').addTextArea(text => {
      text.setValue(edited.description ?? '').onChange(value => set('description', value.trim()));
      text.inputEl.rows = 5;
    });
    new Setting(this.form).setName('封面链接').addText(text => text.setValue(edited.cover_url ?? '').onChange(value => set('cover_url', value.trim() || undefined)));
    let yearText = edited.first_published_year?.toString().padStart(4, '0') ?? '';
    new Setting(this.form).setName('网文首发年份').setDesc('未知时留空；不以最近更新或纸书出版年份代替。').addText(text => text.setValue(yearText).setPlaceholder('未知').onChange(value => { yearText = value.trim(); }));
    new Setting(this.form).setName('连载状态').addDropdown(dropdown => dropdown.addOptions({ unknown: '未知', ongoing: '连载中', completed: '已完结', paused: '暂停' }).setValue(edited.serialization_status ?? 'unknown').onChange(value => set('serialization_status', value)));
    if (edited.last_updated_at) this.form.createEl('p', { text: `来源最近更新：${edited.last_updated_at}`, cls: 'setting-item-description' });
    if (edited.word_count_text) this.form.createEl('p', { text: `来源显示字数：${edited.word_count_text}`, cls: 'setting-item-description' });
    const readForm = () => {
      if (yearText && (!/^\d{4}$/.test(yearText) || Number(yearText) === 0)) throw new Error('年份请填四位数字，未知时留空。');
      set('first_published_year', yearText ? Number(yearText) : undefined);
      if (edited.cover_url && !/^https?:\/\//i.test(edited.cover_url)) throw new Error('封面链接须为 http 或 https 地址。');
      if (!edited.title.trim()) throw new Error('请填写作品标题。');
    };
    const route = this.plugin.importRoute();
    const exports = new Setting(this.form).setName('交给 Media Core');
    if (route.kind === 'core') {
      exports.setDesc('在 Media Core 中查看匹配和字段差异，再确认保存。');
      exports.addButton(button => button.setButtonText('导入 Media Core').setCta().onClick(async () => {
        if (this.submitting) return;
        this.submitting = true;
        button.setDisabled(true);
        try {
          readForm();
          await this.plugin.openCorePreview(toMediaCoreSource(edited), this.target);
          this.initial?.onAccepted?.();
          this.close();
        } catch (error) { this.status.setText(errorText(error)); }
        finally { this.submitting = false; button.setDisabled(false); }
      }));
    } else if (route.kind === 'unavailable') {
      exports.setDesc(route.message);
    }
    exports.addButton(button => button.setButtonText('复制规范来源 JSON').onClick(async () => {
      try {
        readForm();
        await copyMediaCoreSource(edited);
        this.status.setText(copiedMessage);
      } catch (error) { this.status.setText(errorText(error)); }
    }));
    if (route.kind !== 'independent') return;
    if (this.target && isCoreManaged(this.app.metadataCache.getFileCache(this.target)?.frontmatter?.webnovel_import)) {
      this.form.createEl('p', { text: '此作品由 Media Core 托管。请切换导入模式或复制规范来源 JSON 后在 Media Core 中更新。' });
      return;
    }
    const matchArea = this.form.createDiv({ cls: 'webnovel-matches' });
    let selected: TFile | undefined;
    let createSeparate = false;
    let unresolved = false;
    let matchError: string | undefined;
    updateMatches = () => {
      matchArea.empty(); selected = undefined; createSeparate = false; unresolved = false; matchError = undefined;
      if (this.target) return;
      try {
        const plan = this.plugin.importer.previewMatches(edited);
        for (const warning of plan.warnings) matchArea.createEl('p', { text: warning });
        if (plan.exact) {
          matchArea.createEl('p', { text: `已有相同来源，将更新：${plan.exact.path}` });
          return;
        }
        if (!plan.candidates.length) return;
        unresolved = true;
        matchArea.createEl('h3', { text: '发现可能已存在的作品' });
        matchArea.createEl('p', { text: '请核对书名、作者与笔记路径。选择已有笔记可追加来源并保留个人内容，或选择独立创建。' });
        new Setting(matchArea).setName('导入到').addDropdown(dropdown => {
          dropdown.addOption('', '请选择关联目标或独立创建');
          dropdown.addOption('new', '独立创建作品');
          plan.candidates.forEach((file, index) => dropdown.addOption(String(index), file.path));
          dropdown.setValue('').onChange(value => {
            unresolved = !value;
            createSeparate = value === 'new';
            selected = value && !createSeparate ? plan.candidates[Number(value)] : undefined;
          });
        });
      } catch (error) { matchError = errorText(error); matchArea.createEl('p', { text: matchError, cls: 'webnovel-error' }); }
    };
    updateMatches();
    new Setting(this.form).addButton(button => button.setButtonText(this.target ? '保存来源关联' : '导入作品').setCta().onClick(async () => {
      if (this.submitting) return;
      this.submitting = true;
      button.setDisabled(true);
      try {
        const current = this.plugin.importRoute();
        if (current.kind === 'unavailable') throw new Error(current.message);
        if (current.kind !== 'independent') throw new Error('导入模式已切换，请重新打开导入预览。');
        readForm();
        if (matchError) throw new Error(matchError);
        if (unresolved) throw new Error('请先选择关联已有作品或独立创建。');
        this.status.setText('正在保存作品资料…');
        const result = await this.plugin.importer.import(edited, this.target ?? selected, { createSeparate });
        this.initial?.onAccepted?.();
        new Notice(`${result.created ? '已创建' : '已更新'}：${result.file.basename}${result.warnings.length ? `\n${result.warnings.join('\n')}` : ''}`, 8000);
        await this.app.workspace.getLeaf(false).openFile(result.file);
        this.close();
      } catch (error) { this.status.setText(errorText(error)); }
      finally { this.submitting = false; button.setDisabled(false); }
    }));
  }

  onClose(): void { this.generation++; this.contentEl.empty(); }
}

export class ArchiveExportModal extends Modal {
  constructor(private plugin: WebnovelPlugin, private file: TFile) { super(plugin.app); }

  onOpen(): void {
    this.contentEl.createEl('h2', { text: '将当前网文交给 Media Core' });
    this.contentEl.createEl('p', { text: '选择已保存的来源。可靠的原观察时间会沿用，无法核对时间的资料供预览确认。' });
    const status = this.contentEl.createEl('p', { attr: { role: 'status' } });
    let sources: SourceMetadata[];
    try { sources = this.plugin.importer.sources(this.file); }
    catch (error) { status.setText(errorText(error)); return; }
    if (!sources.length) { status.setText('当前笔记没有可导出的网文来源。'); return; }
    let selected = 0;
    const actions = new Setting(this.contentEl).setName('来源');
    actions.addDropdown(dropdown => {
      sources.forEach((source, index) => dropdown.addOption(String(index), `${source.provider} · ${source.id}`));
      dropdown.setValue('0').onChange(value => { selected = Number(value); });
    });
    const route = resolveImportRoute(this.app, 'media-core');
    if (route.kind === 'core') {
      actions.addButton(button => {
        let opening = false;
        button.setButtonText('导入 Media Core').setCta().onClick(async () => {
          if (opening) return;
          opening = true;
          button.setDisabled(true);
          try {
            await this.plugin.openCorePreview(toMediaCoreSource(sources[selected], { archive: true }), this.file, 'media-core');
            this.close();
          } catch (error) { status.setText(errorText(error)); }
          finally { opening = false; button.setDisabled(false); }
        });
      });
    } else if (route.kind === 'unavailable') status.setText(route.message);
    actions.addButton(button => button.setButtonText('复制规范来源 JSON').onClick(async () => {
      try {
        await copyMediaCoreSource(sources[selected], true);
        status.setText(copiedMessage);
      } catch (error) { status.setText(errorText(error)); }
    }));
  }

  onClose(): void { this.contentEl.empty(); }
}

export class BatchImportModal extends Modal {
  private cancelled = false;
  private running = false;

  constructor(private plugin: WebnovelPlugin) { super(plugin.app); }

  onOpen(): void {
    this.contentEl.addClass('webnovel-import-modal');
    this.contentEl.createEl('h2', { text: '批量导入作品链接' });
    const route = this.plugin.importRoute();
    const independent = route.kind === 'independent';
    this.contentEl.createEl('p', { text: independent
      ? '每行一个作品详情页链接。相同来源自动去重；已导入的作品按字段保护规则更新。'
      : '每行一个作品详情页。获取后逐条打开预览，核对后交给 Media Core 或复制规范来源 JSON。' });
    if (route.kind === 'unavailable') this.contentEl.createEl('p', { text: route.message });
    const input = this.contentEl.createEl('textarea', { cls: 'webnovel-links-input', attr: { 'aria-label': '作品链接列表' } });
    const status = this.contentEl.createEl('p', { attr: { role: 'status' } });
    const results = this.contentEl.createEl('ul', { cls: 'webnovel-results' });
    const actions = new Setting(this.contentEl);
    let start: ButtonComponent;
    actions.addButton(button => {
      start = button;
      button.setButtonText(independent ? '开始导入' : '批量获取资料').setCta().onClick(async () => {
        if (this.running) return;
        results.empty();
        const urls = new Map<string, string>();
        let invalidCount = 0;
        for (const line of input.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
          try { const ref = parseBookUrl(line); urls.set(sourceKey(ref), ref.url); }
          catch (error) { invalidCount++; results.createEl('li', { text: `${line}：${errorText(error)}`, cls: 'webnovel-error' }); }
        }
        if (!urls.size) { status.setText(`没有可导入的作品链接；无效链接 ${invalidCount} 条。`); return; }
        this.running = true; this.cancelled = false; start.setDisabled(true); input.disabled = true;
        let done = 0; let failures = 0;
        for (const url of urls.values()) {
          if (this.cancelled) break;
          status.setText(`正在处理 ${done + failures + 1}/${urls.size}…`);
          try {
            const metadata = await this.plugin.importer.fetch(url);
            if (this.cancelled) break;
            if (independent) {
              const current = this.plugin.importRoute();
              if (current.kind === 'unavailable') throw new Error(current.message);
              if (current.kind !== 'independent') throw new Error('导入模式已切换，请重新打开批量导入。');
              const result = await this.plugin.importer.import(metadata);
              results.createEl('li', { text: `${result.created ? '新建' : '更新'}：${result.file.path}${result.warnings.length ? `（${result.warnings.join('；')}）` : ''}` });
            } else {
              const item = results.createEl('li', { text: `${metadata.title} · ${providerName(metadata.provider)} ` });
              new ButtonComponent(item).setButtonText('预览资料').onClick(() => {
                new SingleImportModal(this.plugin, undefined, { metadata }).open();
              });
            }
            done++;
          } catch (error) {
            const item = results.createEl('li', { cls: 'webnovel-error' });
            item.createSpan({ text: `${url}：${errorText(error)} ` });
            new ButtonComponent(item).setButtonText('单独处理').onClick(() => {
              new SingleImportModal(this.plugin, undefined, { url }).open();
            });
            failures++;
          }
          if (done + failures < urls.size && !this.cancelled) await new Promise(resolve => window.setTimeout(resolve, 1200));
        }
        status.setText(`${this.cancelled ? '已停止' : '已完成'}：成功 ${done}，失败 ${failures}，无效链接 ${invalidCount}，未处理 ${urls.size - done - failures}。`);
        this.running = false; start.setDisabled(false); input.disabled = false;
      });
    });
    actions.addButton(button => button.setButtonText('停止后续导入').onClick(() => { this.cancelled = true; status.setText('已请求停止，将保留已完成的导入。'); }));
  }

  onClose(): void { this.cancelled = true; this.contentEl.empty(); }
}

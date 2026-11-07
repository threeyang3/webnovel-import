import { Modal, requireApiVersion } from 'obsidian';
import type WebnovelPlugin from './main';
import { isOfficialSearchPage, officialSearch, searchProviders, type SearchProvider } from './search';
import { parseSearchWorkResult, prepareSearchPageCode, readSearchWorkCode } from './search-guest';
import { parseBookUrl } from './sources';
import { sourceKey, type BookRef } from './types';
import { SingleImportModal } from './ui';

interface SearchWebview extends HTMLElement {
  src: string;
  getURL(): string;
  canGoBack(): boolean;
  goBack(): void;
  reload(): void;
  executeJavaScript(code: string): Promise<unknown>;
}

interface GuestNavigation extends Event {
  isMainFrame: boolean;
  url: string;
}

interface GuestLoadFailure extends GuestNavigation {
  errorCode: number;
}

const searchPartition = 'webnovel-import-search';

export class SearchBrowserModal extends Modal {
  private guest?: SearchWebview;
  private status!: HTMLParagraphElement;
  private back!: HTMLButtonElement;
  private reload!: HTMLButtonElement;
  private preview!: HTMLButtonElement;
  private generation = 0;
  private current?: BookRef;
  private autoPreviewed?: string;
  private selectedFromSearch?: string;
  private onSearchPage = false;
  private reading = false;

  constructor(private plugin: WebnovelPlugin, private provider: SearchProvider, private keyword: string) {
    super(plugin.app);
  }

  onOpen(): void {
    const { url } = officialSearch(this.provider, this.keyword);
    this.modalEl.addClass('webnovel-search-browser');
    this.titleEl.setText(`搜索网文作品 · ${searchProviders[this.provider].name}`);
    const actions = this.contentEl.createDiv({ cls: 'webnovel-search-browser-actions' });
    this.back = actions.createEl('button', { type: 'button', text: '后退' });
    this.reload = actions.createEl('button', { type: 'button', text: '重新加载' });
    this.preview = actions.createEl('button', { type: 'button', text: '预览当前作品' });
    actions.createEl('button', { type: 'button', text: '在外部浏览器打开官网搜索' }).addEventListener('click', async () => {
      try {
        const { shell } = require('electron') as { shell: { openExternal(url: string): Promise<void> } };
        await shell.openExternal(url);
      } catch {
        this.status.setText('无法打开系统默认浏览器。');
      }
    });
    actions.createEl('button', { type: 'button', text: '更换搜索' }).addEventListener('click', () => {
      this.close();
      this.plugin.openSearch();
    });
    this.back.disabled = this.reload.disabled = this.preview.disabled = true;
    this.back.addEventListener('click', () => this.controlGuest(guest => guest.goBack()));
    this.reload.addEventListener('click', () => this.controlGuest(guest => guest.reload()));
    this.preview.addEventListener('click', () => {
      if (this.current) void this.previewWork(this.current);
    });
    this.status = this.contentEl.createEl('p', {
      cls: 'webnovel-status', text: '正在打开官网搜索…', attr: { role: 'status' },
    });
    if (!requireApiVersion('1.8.3')) {
      this.status.setText('内嵌搜索需要桌面版 Obsidian 1.8.3 或更新版本。请在外部浏览器打开官网搜索。');
      return;
    }
    const guest = this.contentEl.ownerDocument.createElement('webview') as SearchWebview;
    guest.addClass('webnovel-search-guest');
    guest.setAttribute('aria-label', `${searchProviders[this.provider].name}官网`);
    // An in-memory partition keeps these pages separate from Obsidian's persistent Web Viewer session.
    guest.setAttribute('partition', searchPartition);
    guest.setAttribute('webpreferences', 'sandbox=yes,contextIsolation=yes,nodeIntegration=no,webSecurity=yes');
    if (typeof guest.executeJavaScript !== 'function' || typeof guest.getURL !== 'function') {
      this.status.setText('当前 Obsidian 无法显示内嵌网页。请在外部浏览器打开官网搜索。');
      return;
    }
    try {
      // Use the same desktop permission setup as Obsidian's Canvas and Web Viewer.
      // The partition has no persist: prefix, so it has no on-disk browser session.
      const { ipcRenderer } = require('electron') as { ipcRenderer: { send(channel: string, partition: string, adblock: boolean): void } };
      ipcRenderer.send('create-browser-session', searchPartition, false);
    } catch {
      this.status.setText('当前 Obsidian 无法初始化内嵌搜索。请在外部浏览器打开官网搜索。');
      return;
    }
    this.guest = guest;
    guest.addEventListener('did-start-navigation', event => {
      const navigation = event as GuestNavigation;
      if (!navigation.isMainFrame || this.guest !== guest) return;
      if (this.onSearchPage) {
        const book = this.bookAt(navigation.url);
        this.selectedFromSearch = book && sourceKey(book);
      }
      this.onSearchPage = false;
      this.resetPage('正在打开网页…');
    });
    guest.addEventListener('dom-ready', () => this.onPageReady(guest));
    guest.addEventListener('did-navigate-in-page', event => {
      if ((event as GuestNavigation).isMainFrame) this.onPageReady(guest);
    });
    guest.addEventListener('did-fail-load', event => {
      const failure = event as GuestLoadFailure;
      if (!failure.isMainFrame || failure.errorCode === -3 || this.guest !== guest) return;
      this.selectedFromSearch = undefined;
      this.resetPage('网页加载失败。可以重新加载、返回搜索结果或在外部浏览器打开官网搜索。');
      this.updateControls(guest);
    });
    guest.src = url;
    this.contentEl.appendChild(guest);
  }

  private controlGuest(action: (guest: SearchWebview) => void): void {
    if (!this.guest) return;
    try { action(this.guest); }
    catch { this.status.setText('网页暂时无法操作。请重新打开官网搜索。'); }
  }

  private resetPage(message: string): void {
    this.generation++;
    this.current = undefined;
    this.reading = false;
    this.preview.disabled = true;
    this.status.setText(message);
  }

  private updateControls(guest: SearchWebview): void {
    try { this.back.disabled = !guest.canGoBack(); }
    catch { this.back.disabled = true; }
    this.reload.disabled = false;
  }

  private currentAddress(guest: SearchWebview): string {
    try { return guest.getURL(); }
    catch { return ''; }
  }

  private bookAt(address: string): BookRef | undefined {
    if (!address.startsWith('https://')) return undefined;
    try {
      const book = parseBookUrl(address);
      return book.provider === this.provider ? book : undefined;
    } catch { return undefined; }
  }

  private onPageReady(guest: SearchWebview): void {
    if (this.guest !== guest) return;
    this.updateControls(guest);
    const address = this.currentAddress(guest);
    const ref = this.bookAt(address);
    if (ref) {
      this.current = ref;
      this.preview.disabled = this.reading;
      const key = sourceKey(ref);
      if (this.selectedFromSearch === key && this.autoPreviewed !== key) {
        void this.previewWork(ref);
      } else if (!this.reading) {
        this.status.setText('可以预览当前作品，也可以后退继续选择。');
      }
      return;
    }
    this.autoPreviewed = undefined;
    this.selectedFromSearch = undefined;
    const isSearch = this.onSearchPage = isOfficialSearchPage(this.provider, address);
    this.resetPage(isSearch
      ? '在官网搜索结果中点开作品，插件会打开导入预览。'
      : '请从官网搜索结果中打开作品详情页。');
    if (!isSearch) return;
    const generation = this.generation;
    void guest.executeJavaScript(prepareSearchPageCode(this.provider, this.keyword)).catch(() => {
      if (this.guest === guest && this.generation === generation) {
        this.status.setText('可以在官网搜索框输入关键词，再从结果中打开作品。');
      }
    });
  }

  private async previewWork(ref: BookRef): Promise<void> {
    const guest = this.guest;
    if (!guest || this.reading) return;
    const generation = this.generation;
    const isCurrent = () => {
      if (this.guest !== guest || this.generation !== generation) return false;
      const book = this.bookAt(this.currentAddress(guest));
      return book !== undefined && sourceKey(book) === sourceKey(ref);
    };
    const code = readSearchWorkCode(ref);
    this.reading = this.preview.disabled = true;
    this.status.setText('正在读取作品资料…');
    let failure: unknown;
    // Some official pages hydrate their work information shortly after DOM ready.
    for (const delay of [0, 300, 900]) {
      if (delay) await new Promise<void>(resolve => window.setTimeout(resolve, delay));
      if (!isCurrent()) return;
      try {
        const result = await guest.executeJavaScript(code);
        if (!isCurrent()) return;
        const metadata = parseSearchWorkResult(result, ref);
        this.reading = this.preview.disabled = false;
        this.autoPreviewed = sourceKey(ref);
        this.status.setText(`已读取「${metadata.title}」。可以重新预览，或后退继续选择。`);
        new SingleImportModal(this.plugin, undefined, { metadata, onAccepted: () => this.close() }).open();
        return;
      } catch (error) {
        failure = error;
      }
    }
    if (!isCurrent()) return;
    this.reading = this.preview.disabled = false;
    const message = failure instanceof Error ? failure.message : String(failure);
    this.status.setText(`未能读取作品资料。请确认网页已正常显示后，再点「预览当前作品」。\n${message}`);
  }

  onClose(): void {
    this.generation++;
    this.guest = undefined;
    this.current = undefined;
    this.autoPreviewed = undefined;
    this.selectedFromSearch = undefined;
    this.onSearchPage = false;
    this.reading = false;
    this.contentEl.empty();
  }
}

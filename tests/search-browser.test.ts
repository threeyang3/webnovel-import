import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import type WebnovelPlugin from '../src/main';
import { officialSearch, type SearchProvider } from '../src/search';

test('the external search button opens the official URL only on click when embedded search is unavailable', t => {
  const { document, HTMLElement, Event } = parseHTML('<html></html>');
  const createElement = document.createElement.bind(document);
  let supportsVersion = true;
  let hasWebview = true;
  let canInitialize = true;
  const opened: string[] = [];
  const createEl = function (this: HTMLElement, tag: string, options: { cls?: string; text?: string }) {
    const el = document.createElement(tag);
    if (options.cls) el.className = options.cls;
    if (options.text) el.textContent = options.text;
    return this.appendChild(el);
  };
  Object.assign(HTMLElement.prototype, {
    addClass(this: HTMLElement, name: string) { this.classList.add(name); },
    setText(this: HTMLElement, value: string) { this.textContent = value; },
    createEl,
    createDiv(this: HTMLElement, options: { cls?: string }) { return createEl.call(this, 'div', options); },
  });
  document.createElement = ((tag: string) => {
    const element = createElement(tag);
    if (tag === 'webview' && hasWebview) {
      Object.assign(element, {
        executeJavaScript: async () => undefined,
        getURL: () => '',
        canGoBack: () => false,
      });
    }
    return element;
  }) as typeof document.createElement;
  const obsidian = {
    Modal: class {
      modalEl = document.createElement('div');
      contentEl = this.modalEl.appendChild(document.createElement('div'));
      titleEl = this.modalEl.appendChild(document.createElement('div'));
    },
    requireApiVersion: () => supportsVersion,
  };
  const electron = {
    shell: { openExternal: async (url: string) => { opened.push(url); } },
    ipcRenderer: { send() { if (!canInitialize) throw new Error('会话接口不可用'); } },
  };
  const loader = Module as typeof Module & { _load: (name: string, ...args: unknown[]) => unknown };
  const load = loader._load;
  loader._load = function (name, ...args) {
    if (name === 'obsidian') return obsidian;
    if (name === 'electron') return electron;
    return load.call(this, name, ...args);
  };
  t.after(() => { loader._load = load; });
  const { SearchBrowserModal } = require('../src/search-browser') as typeof import('../src/search-browser');
  const keyword = '书名 & 作者';

  const verifyFallback = (provider: SearchProvider, status: RegExp, failLoad = false) => {
    const modal = new SearchBrowserModal({ app: {} } as WebnovelPlugin, provider, keyword);
    const countBefore = opened.length;
    modal.onOpen();
    if (failLoad) {
      const guest = modal.contentEl.querySelector('webview');
      assert.ok(guest);
      guest.dispatchEvent(Object.assign(new Event('did-fail-load'), { isMainFrame: true, errorCode: -2 }));
    }
    assert.match(modal.contentEl.querySelector('.webnovel-status')?.textContent ?? '', status);
    assert.equal(opened.length, countBefore);
    const button = Array.from(modal.contentEl.querySelectorAll('button')).find(el => el.textContent === '在外部浏览器打开官网搜索');
    assert.ok(button);
    assert.equal(button.disabled, false);
    button.click();
    assert.deepEqual(opened.slice(countBefore), [officialSearch(provider, keyword).url]);
  };

  supportsVersion = false;
  for (const provider of ['qidian', 'fanqie', 'qimao', 'jjwxc'] as const) verifyFallback(provider, /1\.8\.3/);
  supportsVersion = true;
  hasWebview = false;
  verifyFallback('qidian', /无法显示内嵌网页/);
  hasWebview = true;
  canInitialize = false;
  verifyFallback('fanqie', /无法初始化内嵌搜索/);
  canInitialize = true;
  verifyFallback('qimao', /网页加载失败/, true);
});

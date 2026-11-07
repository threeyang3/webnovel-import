import { isOfficialSearchPage, type SearchProvider } from './search';
import { parseBookUrl, parseSourceDocument } from './sources';
import { sourceKey } from './types';

const clickHandler = Symbol.for('webnovel-import.search-result-handler');

function selectedWork(provider: SearchProvider, href: string | URL): string | undefined {
  try {
    const work = parseBookUrl(new URL(href, location.href).href);
    if (work.provider === provider) return work.url;
  } catch { /* This link is not an official work detail page. */ }
  return undefined;
}

/** Runs in the search guest. Keep official book links in the current page. */
export function prepareSearchPage(provider: SearchProvider, keyword: string): void {
  if (!isOfficialSearchPage(provider, location.href)) return;
  if (provider === 'jjwxc') {
    const form = document.querySelector<HTMLFormElement>('form#formleft');
    const input = form?.querySelector<HTMLInputElement>('input#autoComplete[name="kw"]');
    if (form && input) {
      // The site's normal submit handler generates the current search parameters.
      form.target = '_self';
      if (!input.value) input.value = keyword;
    }
  }
  if (Reflect.get(window, clickHandler)) return;
  Reflect.set(window, clickHandler, true);
  if (provider === 'fanqie') {
    // Fanqie's result titles and covers call window.open instead of using links.
    const open = window.open.bind(window);
    window.open = (url, target, features) => {
      const work = url && navigator.userActivation?.isActive && isOfficialSearchPage(provider, location.href)
        ? selectedWork(provider, url) : undefined;
      if (!work) return open(url, target, features);
      location.assign(work);
      return null;
    };
  }
  window.addEventListener('click', event => {
    if (!event.isTrusted || event.button !== 0 || !isOfficialSearchPage(provider, location.href)) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!anchor) return;
    const work = selectedWork(provider, anchor.href);
    if (!work) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(work);
  }, { capture: true });
}

/** Reads a single selected detail page and rejects a navigation race inside the guest. */
export function readSearchWork(expectedUrl: string): unknown {
  try {
    const current = parseBookUrl(location.href);
    if (sourceKey(current) !== sourceKey(parseBookUrl(expectedUrl))) {
      throw new Error('作品页已切换，请重新选中作品。');
    }
    return { metadata: parseSourceDocument(document, current, 'browser') };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '作品资料暂时无法读取。' };
  }
}

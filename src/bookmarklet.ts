import { encodeCapture } from './browser-capture';
import { parseBookUrl, parseSourceHtml } from './sources';

/** Runs only when the user clicks the installed bookmark on an already displayed page. */
export async function capture(vault: string): Promise<void> {
  try {
    const ref = parseBookUrl(location.href);
    if (ref.provider !== 'qidian') throw new Error('请在起点作品详情页点击此书签。');
    // Parse only the book header, synopsis and page metadata. Only the parser's
    // selected metadata fields are copied; no full HTML or website script is sent.
    const head = Array.from(document.querySelectorAll('meta[property^="og:"],meta[name^="og:"],link[rel="canonical"]'))
      .map(element => element.outerHTML).join('\n');
    const body = [document.querySelector('#book-detail'), document.querySelector('#book-intro-detail')]
      .filter((element): element is Element => element !== null).map(element => element.outerHTML).join('\n');
    const metadata = parseSourceHtml(`<html><head>${head}</head><body>${body}</body></html>`, ref, 'browser');
    const payload = encodeCapture(metadata);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Browsers can deny clipboard access. Let the user copy the same data explicitly.
      if (window.prompt('浏览器未允许直接复制。请复制下方完整资料，再按确定返回 Obsidian；取消则停止。', payload) === null) return;
    }
    const query = new URLSearchParams({ vault, clipboard: '1', provider: ref.provider, id: ref.id });
    location.assign(`obsidian://webnovel-import?${query}`);
  } catch (error) {
    window.alert(`网文资料尚未采集：${error instanceof Error ? error.message : String(error)}`);
  }
}

import { encodeCapture } from './browser-capture';
import { getSourceAdapter, parseBookUrl, parseSourceHtml } from './sources';

/** Runs only when the user clicks the installed bookmark on an already displayed page. */
export async function capture(vault: string): Promise<void> {
  try {
    const ref = parseBookUrl(location.href);
    const adapter = getSourceAdapter(ref.provider);
    if (!adapter.browserCapture) throw new Error('此来源暂不支持浏览器采集书签。');
    const html = Array.from(document.querySelectorAll(adapter.browserCapture.selectors.join(',')))
      .map(element => element.outerHTML).join('\n');
    const metadata = parseSourceHtml(html, ref, 'browser');
    const payload = encodeCapture(metadata);
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Browsers can deny clipboard access. Let the user copy the same data explicitly.
      if (window.prompt('浏览器未允许直接复制。请复制下方完整资料，再按确定返回 Obsidian；取消则停止。', payload) === null) return;
    }
    const query = new URLSearchParams({
      vault, clipboard: '1', provider: ref.provider, id: ref.id, capturedAt: metadata.fetched_at,
    });
    location.assign(`obsidian://webnovel-import?${query}`);
  } catch (error) {
    window.alert(`网文资料尚未采集：${error instanceof Error ? error.message : String(error)}`);
  }
}

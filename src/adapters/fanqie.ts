import type { BookRef } from '../types';
import type { SourceAdapter, SourceFields, ResolveUrl } from './types';
import { clean, text, imageUrl, status, pageIdentities } from './shared';

function fanqieCover(doc: Document, ref: BookRef, resolveUrl: ResolveUrl): { url: string; evidence: string } | undefined {
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    let data: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(script.textContent || '');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
      data = parsed as Record<string, unknown>;
    } catch { continue; }
    // The real public page has a Baidu JSON-LD block with the canonical book URL
    // in @id and the actual signed cover URL in images. Never use numeric IDs.
    if (typeof data['@id'] !== 'string') continue;
    let identity: BookRef;
    try { identity = resolveUrl(data['@id']); } catch { continue; }
    if (identity.provider !== ref.provider || identity.id !== ref.id) continue;
    const value = data.images ?? data.image;
    const images = Array.isArray(value) ? value : [value];
    for (const candidate of images) {
      if (typeof candidate !== 'string') continue;
      const url = imageUrl(candidate, ref.url);
      if (url) return { url, evidence: '作品页 JSON-LD images/image，@id 与作品链接一致' };
    }
  }
  const url = imageUrl(doc.querySelector('.page-header-info .book-cover-img')?.getAttribute('src'), ref.url);
  // This URL was observed in real HTML and visually verified to be a grey loading
  // placeholder. It is not a cover, even though its element is book-cover-img.
  if (!url || new URL(url).pathname.includes('/novel-static/5cb03bd354145bc7815a5e09d4b15cfc')) return undefined;
  return { url, evidence: '作品页 .page-header-info .book-cover-img[src]，已排除已知加载占位图' };
}

export const fanqieAdapter = {
  provider: 'fanqie',
  name: '番茄小说',
  recoveryHint: '可在浏览器正常打开后选择另存的 HTML 文件，或手动补填。',
  matchUrl(url: URL): BookRef | undefined {
    const id = url.hostname === 'fanqienovel.com' ? /^\/page\/(\d+)\/?$/.exec(url.pathname)?.[1] : undefined;
    return id ? { provider: 'fanqie', id, url: `https://fanqienovel.com/page/${id}` } : undefined;
  },
  identities(doc: Document, ref: BookRef, resolveUrl: ResolveUrl) {
    const { identities, addUrl } = pageIdentities(doc, ref, resolveUrl);
    if (!identities.length) {
      // Fanqie's real public page has a top-level book @id. Nested recommendation
      // IDs cannot establish this page's identity; multiple root books are ambiguous.
      for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
        let data: unknown;
        try { data = JSON.parse(script.textContent || ''); } catch { continue; }
        const roots = Array.isArray(data) ? data : [data];
        for (const root of roots) {
          if (root && typeof root === 'object' && typeof (root as Record<string, unknown>)['@id'] === 'string') {
            addUrl((root as Record<string, string>)['@id'], '作品页 JSON-LD 顶层 @id');
          }
        }
      }
    }
    return identities;
  },
  parse(doc: Document, ref: BookRef, resolveUrl: ResolveUrl): SourceFields {
    const result: SourceFields = { title: '', authors: [], evidence: {}, warnings: [] };
    const header = doc.querySelector('.page-header-info');
    result.title = header ? text(header, '.info-name h1') || '' : '';
    const author = header && text(header, '.author-name-text');
    if (author) result.authors = [author];
    const cover = fanqieCover(doc, ref, resolveUrl);
    if (cover) {
      result.cover_url = cover.url;
      result.evidence.cover_url = cover.evidence;
    }
    if (header) {
      result.tags = Array.from(header.querySelectorAll('.info-label-grey'))
        .map(el => clean(el.textContent)).filter((tag): tag is string => Boolean(tag));
      result.serialization_status = status(text(header, '.info-label-yellow'));
      result.word_count_text = text(header, '.info-count-word')?.replace(/\s/g, '');
      result.last_updated_at = text(header, '.info-last-time');
      result.latest_chapter = text(header, '.info-last-title')?.replace(/^最近更新\s*[：:]\s*/, '');
    }
    result.description = text(doc, '.page-body .page-abstract-content');
    result.evidence.title = '作品页 .page-header-info .info-name h1';
    result.evidence.authors = '作品页 .page-header-info .author-name-text';
    if (result.description) result.evidence.description = '作品页 .page-body .page-abstract-content';
    if (result.tags?.length) result.evidence.tags = '作品页 .page-header-info .info-label-grey';
    if (result.serialization_status) result.evidence.serialization_status = '作品页 .info-label-yellow';
    if (result.word_count_text) result.evidence.word_count_text = '作品页 .info-count-word；保留网站显示精度';
    if (result.last_updated_at) result.evidence.last_updated_at = '作品页 .info-last-time；平台原始显示时间，非首发日期';
    if (result.latest_chapter) result.evidence.latest_chapter = '作品页 .info-last-title';
    return result;
  },
} as const satisfies SourceAdapter;

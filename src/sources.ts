import type { BookRef, SourceMetadata } from './types';

/** Resolve a book detail URL, never a search result or chapter URL. */
export function parseBookUrl(input: string): BookRef {
  let url: URL;
  try { url = new URL(input.trim()); }
  catch { throw new Error('请输入完整的起点或番茄作品详情页链接。'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('作品链接必须是普通的 HTTP 或 HTTPS 官网链接。');
  }
  const host = url.hostname.toLowerCase();
  const pattern = host === 'book.qidian.com' ? /^\/info\/(\d+)\/?$/
    : ['www.qidian.com', 'm.qidian.com'].includes(host) ? /^\/book\/(\d+)\/?$/
    : host === 'fanqienovel.com' ? /^\/page\/(\d+)\/?$/ : undefined;
  const match = pattern?.exec(url.pathname);
  if (!match) throw new Error('仅支持起点 /book/ 或 /info/、番茄 /page/ 作品详情页；请勿使用章节或搜索页链接。');
  const id = match[1]; // IDs are identifiers, including Fanqie's 19 digit IDs, never Numbers.
  const provider = host === 'fanqienovel.com' ? 'fanqie' : 'qidian';
  return { provider, id, url: provider === 'fanqie'
    ? `https://fanqienovel.com/page/${id}` : `https://www.qidian.com/book/${id}/` };
}

const clean = (value: string | null | undefined): string | undefined =>
  value?.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').trim() || undefined;

function text(root: ParentNode, selector: string): string | undefined {
  return clean(root.querySelector(selector)?.textContent);
}

function meta(doc: Document, key: string): string | undefined {
  return clean(doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content'));
}

function imageUrl(value: string | null | undefined, base: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim(), base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

function status(value: string | undefined): SourceMetadata['serialization_status'] {
  if (!value) return undefined;
  if (/完结|完本|已完成/.test(value)) return 'completed';
  if (/暂停|停更|断更/.test(value)) return 'paused';
  if (/连载/.test(value)) return 'ongoing';
  return undefined;
}

function fanqieCover(doc: Document, ref: BookRef): { url: string; evidence: string } | undefined {
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
    try { identity = parseBookUrl(data['@id']); } catch { continue; }
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

/** Read only string URL identities. No scripts are executed and no numeric IDs are parsed. */
function checkIdentity(doc: Document, ref: BookRef): void {
  const candidates = [doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    meta(doc, 'og:url'), meta(doc, 'og:novel:book_url')];
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    // Fanqie's public Baidu JSON-LD block identifies the book with an @id URL.
    for (const match of (script.textContent || '').matchAll(/"@id"\s*:\s*("(?:[^"\\]|\\.)*")/g)) {
      try { candidates.push(JSON.parse(match[1]) as string); } catch { /* Ignore malformed optional JSON strings. */ }
    }
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    let actual: BookRef;
    try { actual = parseBookUrl(new URL(candidate, ref.url).href); }
    catch { continue; } // Non-book schema IDs are irrelevant.
    if (actual.provider !== ref.provider || actual.id !== ref.id) {
      throw new Error('页面标识与输入的作品链接不一致，请核对链接和 HTML 文件。');
    }
  }
}

export function parseSourceHtml(
  html: string, ref: BookRef, acquisition: 'remote' | 'html' = 'remote',
): SourceMetadata {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  checkIdentity(doc, ref);
  const result: SourceMetadata = {
    ...ref, title: '', authors: [], fetched_at: new Date().toISOString(), acquisition,
    evidence: {}, warnings: [],
  };

  if (ref.provider === 'fanqie') {
    const header = doc.querySelector('.page-header-info');
    result.title = header ? text(header, '.info-name h1') || '' : '';
    const author = header && text(header, '.author-name-text');
    if (author) result.authors = [author];
    const cover = fanqieCover(doc, ref);
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
  } else {
    // Qidian online access currently returned a challenge. Only explicit novel meta fields
    // are supported here; a generic title/description is never enough to identify a book.
    result.title = meta(doc, 'og:novel:book_name') || '';
    const author = meta(doc, 'og:novel:author');
    if (author) result.authors = [author];
    result.description = meta(doc, 'og:novel:description') || meta(doc, 'og:description');
    result.cover_url = imageUrl(meta(doc, 'og:image'), ref.url);
    const category = meta(doc, 'og:novel:category');
    if (category) result.tags = [category];
    result.serialization_status = status(meta(doc, 'og:novel:status'));
    result.word_count_text = meta(doc, 'og:novel:word_count');
    result.last_updated_at = meta(doc, 'og:novel:update_time');
    result.latest_chapter = meta(doc, 'og:novel:latest_chapter_name');
    result.evidence.title = 'meta og:novel:book_name';
    result.evidence.authors = 'meta og:novel:author';
    if (result.description) result.evidence.description = 'meta og:novel:description / og:description';
    if (result.cover_url) result.evidence.cover_url = 'meta og:image';
    if (result.tags) result.evidence.tags = 'meta og:novel:category';
    if (result.serialization_status) result.evidence.serialization_status = 'meta og:novel:status';
    if (result.word_count_text) result.evidence.word_count_text = 'meta og:novel:word_count';
    if (result.last_updated_at) result.evidence.last_updated_at = 'meta og:novel:update_time；非首发日期';
    if (result.latest_chapter) result.evidence.latest_chapter = 'meta og:novel:latest_chapter_name';
    result.warnings.push('起点适配基于公开元标签格式，当前站点在线访问尚未验证成功。');
  }

  if (!result.title || result.authors.length === 0) {
    throw new Error('未识别到可靠的书名和作者。页面可能是验证页、登录页或结构已变化；请在浏览器确认作品详情页，或使用手动建档。');
  }
  if (!result.cover_url) result.warnings.push('未提取到可用封面地址，可稍后手动补充。');
  if (!result.description) result.warnings.push('未提取到作品简介，可稍后手动补充。');
  // Neither latest-update dates nor chapter dates establish the work's first publication.
  result.warnings.push('未获得明确的首发日期，首发年份留空；不会用最近更新时间推断年份。');
  return result;
}

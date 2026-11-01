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

function textWithBreaks(root: ParentNode, selector: string): string | undefined {
  const element = root.querySelector(selector);
  if (!element) return undefined;
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  copy.querySelectorAll('script, style').forEach(node => node.remove());
  return clean(copy.textContent?.replace(/\r\n?/g, '\n').replace(/[\t ]*\n[\t ]*/g, '\n'));
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

/** Check the current page, not every recommended entity mentioned by JSON-LD. */
function checkIdentity(doc: Document, ref: BookRef): string {
  const identities: { book: BookRef; evidence: string }[] = [];
  const addUrl = (value: string | null | undefined, evidence: string): void => {
    if (!value) return;
    try { identities.push({ book: parseBookUrl(new URL(value, ref.url).href), evidence }); }
    catch { /* A homepage, author or other non-book URL is not book identity evidence. */ }
  };
  addUrl(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), 'link[rel="canonical"]');
  for (const key of ['og:url', 'og:novel:book_url', 'og:novel:read_url']) addUrl(meta(doc, key), `meta ${key}`);
  if (ref.provider === 'qidian') {
    const id = doc.querySelector('#book-detail #bookImg')?.getAttribute('data-bid');
    if (id && /^\d+$/.test(id)) {
      identities.push({ book: { ...ref, id }, evidence: '#book-detail #bookImg[data-bid]' });
    }
  }

  if (!identities.length && ref.provider === 'fanqie') {
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
  if (!identities.length) {
    throw new Error('未识别到可核对的作品标识，不能将页面资料绑定到输入链接；请提供完整作品详情页或使用手动建档。');
  }
  for (const { book } of identities) {
    if (book.provider !== ref.provider || book.id !== ref.id) {
      throw new Error('页面标识与输入的作品链接不一致，请核对链接和 HTML 文件。');
    }
  }
  return identities.map(identity => identity.evidence).join('；');
}

export function parseSourceHtml(
  html: string, ref: BookRef, acquisition: 'remote' | 'html' | 'browser' = 'remote',
): SourceMetadata {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const identityEvidence = checkIdentity(doc, ref);
  const result: SourceMetadata = {
    ...ref, title: '', authors: [], fetched_at: new Date().toISOString(), acquisition,
    evidence: { identity: identityEvidence }, warnings: [],
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
    // These selectors were verified on Qidian's actual rendered book detail page.
    // The page's short .intro slogan is not the full book synopsis.
    const header = doc.querySelector('#book-detail .book-info-top');
    const visibleTitle = header ? text(header, '#bookName') : undefined;
    const visibleAuthor = header ? clean(text(header, '.book-meta .author')?.replace(/^作者\s*[：:]\s*/, '')) : undefined;
    result.title = visibleTitle || meta(doc, 'og:novel:book_name') || '';
    const author = visibleAuthor || meta(doc, 'og:novel:author');
    if (author) result.authors = [author];

    const visibleDescription = textWithBreaks(doc, '#book-intro-detail');
    result.description = visibleDescription || meta(doc, 'og:novel:description') || meta(doc, 'og:description');
    const cover = doc.querySelector('#book-detail #bookImg');
    const visibleCover = cover?.getAttribute('data-bid') === ref.id
      ? imageUrl(cover.querySelector('img')?.getAttribute('src'), ref.url) : undefined;
    result.cover_url = visibleCover || imageUrl(meta(doc, 'og:image'), ref.url);

    const visibleTags = header ? Array.from(header.querySelectorAll('.book-attribute a'))
      .map(link => clean(link.textContent)).filter((tag): tag is string => Boolean(tag)) : [];
    const category = meta(doc, 'og:novel:category');
    if (visibleTags.length) result.tags = [...new Set(visibleTags)];
    else if (category) result.tags = [category];
    const visibleStatus = header ? Array.from(header.querySelectorAll('.book-attribute span'))
      .map(span => status(clean(span.textContent))).find(value => value !== undefined) : undefined;
    result.serialization_status = visibleStatus || status(meta(doc, 'og:novel:status'));

    const wordLabel = header ? Array.from(header.querySelectorAll('.count cite'))
      .find(label => clean(label.textContent) === '字') : undefined;
    const wordValue = wordLabel?.previousElementSibling;
    const visibleWords = wordValue?.tagName.toLowerCase() === 'em' && clean(wordValue.textContent)
      ? `${clean(wordValue.textContent)}字` : undefined;
    result.word_count_text = visibleWords || meta(doc, 'og:novel:word_count');
    const visibleUpdated = header ? clean(text(header, '.book-meta .update-time')?.replace(/^更新时间\s*[：:]\s*/, '')) : undefined;
    const visibleChapter = header ? clean(text(header, '.book-latest-chapter')?.replace(/^最新章节\s*[：:]\s*/, '')) : undefined;
    result.last_updated_at = visibleUpdated || meta(doc, 'og:novel:update_time');
    result.latest_chapter = visibleChapter || meta(doc, 'og:novel:latest_chapter_name');

    result.evidence.title = visibleTitle ? '#book-detail .book-info-top #bookName' : 'meta og:novel:book_name';
    result.evidence.authors = visibleAuthor ? '#book-detail .book-info-top .book-meta .author' : 'meta og:novel:author';
    if (result.description) result.evidence.description = visibleDescription ? '#book-intro-detail；保留br换行' : 'meta og:novel:description / og:description';
    if (result.cover_url) result.evidence.cover_url = visibleCover ? '#book-detail #bookImg[data-bid与作品ID一致] img[src]' : 'meta og:image';
    if (result.tags) result.evidence.tags = visibleTags.length ? '#book-detail .book-info-top .book-attribute a' : 'meta og:novel:category';
    if (result.serialization_status) result.evidence.serialization_status = visibleStatus ? '#book-detail .book-info-top .book-attribute span' : 'meta og:novel:status';
    if (result.word_count_text) result.evidence.word_count_text = visibleWords ? '#book-detail .book-info-top .count；仅取字数，保留显示精度' : 'meta og:novel:word_count';
    if (result.last_updated_at) result.evidence.last_updated_at = visibleUpdated ? '#book-detail .book-info-top .update-time；非首发日期' : 'meta og:novel:update_time；非首发日期';
    if (result.latest_chapter) result.evidence.latest_chapter = visibleChapter ? '#book-detail .book-info-top .book-latest-chapter' : 'meta og:novel:latest_chapter_name';
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

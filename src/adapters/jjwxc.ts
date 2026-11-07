import type { BookRef } from '../types';
import type { ResolveUrl, SourceAdapter, SourceFields } from './types';
import { clean, imageUrl, pageIdentities, status, text, textWithBreaks } from './shared';

const wapIdentity = 'td.readtd a[href*="m.jjwxc.net/book2/"]';
const mobileTitle = 'body > div.b.module > h2.big > span.uninterested-author[data-novelid]';
const mobileInfo = '#info #left';
const desktopTitle = 'td.sptd h1[itemprop="name"] [itemprop="articleSection"]';
const desktopAuthor = 'td.sptd h2 [itemprop="author"]';
const newestRow = 'tr[itemprop~="newestChapter"]';
const newestChapter = `${newestRow} [itemprop="headline"] a[itemprop="url"]`;
const newestUpdate = `${newestRow} td[title*="章节首发时间"]`;
const coverSelector = 'img.noveldefaultimage[itemprop="image"]';

function displayDate(value?: string): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/.test(value) ? value : undefined;
}

function customCover(doc: Document, ref: BookRef): string | undefined {
  const img = doc.querySelector(coverSelector);
  const cover = imageUrl(img?.getAttribute('src'), ref.url);
  const defaultCover = imageUrl(img?.getAttribute('_src'), ref.url);
  // Both default and uploaded work covers use the same class; _src is the default.
  if (!cover || !defaultCover || cover === defaultCover) return undefined;
  const fallback = new URL(defaultCover);
  const actual = new URL(cover);
  if (!/^i\d+-static\.jjwxc\.net$/.test(fallback.hostname) || fallback.pathname !== '/novelimage.php'
    || fallback.searchParams.get('novelid') !== ref.id || !/^i\d+-static\.jjwxc\.net$/.test(actual.hostname)) return undefined;
  if (actual.pathname === '/authorimagespace.php' || actual.pathname.startsWith('/tmp/backend/authorspace/')) return cover;
  return undefined;
}

function addTags(result: SourceFields, genre: string | undefined, links: NodeListOf<Element>, locator: string): void {
  const tags = [genre, ...Array.from(links, link => clean(link.textContent))]
    .filter((tag): tag is string => Boolean(tag));
  if (tags.length) {
    result.tags = [...new Set(tags)];
    result.evidence.tags = locator;
  }
}

function parseDesktop(doc: Document, ref: BookRef, result: SourceFields): void {
  const description = '#novelintro[itemprop="description"]';
  const info = '.smallreadbody';
  const modified = 'body > meta[itemprop="dateModified"]';
  result.title = text(doc, desktopTitle) || '';
  const author = text(doc, desktopAuthor);
  if (author) result.authors = [author];
  result.cover_url = customCover(doc, ref);
  result.description = textWithBreaks(doc, description);
  result.serialization_status = status(text(doc, '[itemprop="updataStatus"]'));
  result.word_count_text = text(doc, '[itemprop="wordCount"]');
  result.latest_chapter = text(doc, newestChapter);
  // The visible cell is the update time. Its tooltip separately shows chapter first publication.
  const chapterUpdated = result.latest_chapter && displayDate(text(doc, newestUpdate)?.replace(/\s*\*最新更新$/, ''));
  result.last_updated_at = chapterUpdated || displayDate(clean(doc.querySelector(modified)?.getAttribute('content')));
  addTags(result, text(doc, '[itemprop="genre"]'), doc.querySelectorAll(`${info} a[href*="bookbase.php?bq="]`),
    '作品页 [itemprop=genre] 及 .smallreadbody 内容标签链接');
  result.evidence.title = desktopTitle;
  result.evidence.authors = desktopAuthor;
  if (result.cover_url) result.evidence.cover_url = `${coverSelector}[src]，有别于本书默认封面 _src`;
  if (result.description) result.evidence.description = description;
  if (result.serialization_status) result.evidence.serialization_status = '作品页 [itemprop=updataStatus]';
  if (result.word_count_text) result.evidence.word_count_text = '作品页 [itemprop=wordCount]';
  if (result.latest_chapter) result.evidence.latest_chapter = newestChapter;
  if (result.last_updated_at) result.evidence.last_updated_at = chapterUpdated
    ? `${newestUpdate} 的可见更新时间` : `${modified}[content]（作品更新时间）`;
}

function parseMobile(doc: Document, heading: Element, result: SourceFields): void {
  const authorSelector = `${mobileInfo} .authorname-content > a[href^="/wapauthor/"]`;
  const intro = 'li#novelintro';
  const description = `${intro} #novelintro_whole`;
  const details = Array.from(doc.querySelectorAll(`${mobileInfo} > li`));
  const detail = (label: string): string | undefined => details.map(el => clean(el.textContent))
    .find(value => value?.startsWith(`${label}：`))?.slice(label.length + 1).trim();
  result.title = clean(heading.getAttribute('data-novelname')) || '';
  const visibleAuthor = text(doc, authorSelector);
  const author = visibleAuthor || clean(heading.getAttribute('data-authorname'));
  if (author) result.authors = [author];
  result.description = textWithBreaks(doc, description);
  if (result.description) result.evidence.description = description;
  else if (!doc.querySelector(description)) {
    // Short mobile blurbs use direct text and BRs after the label.
    const nodes = doc.querySelector(intro)?.childNodes;
    const short = Array.from(nodes ?? [], node => node.nodeType === 3 ? node.textContent?.replace(/\s+/g, ' ')
      : node.nodeName === 'BR' ? '\n' : '').join('');
    result.description = clean(short.replace(/^\s*简介\s*[：:]\s*/, '').replace(/ *\n */g, '\n'));
    if (result.description) result.evidence.description = `${intro} 的直接文本与 br`;
  }
  const state = detail('状态');
  result.serialization_status = status(state);
  result.word_count_text = state?.split('/').map(value => value.trim()).find(value => /^\d+字$/.test(value));
  const summary = doc.querySelector('meta[name="description"]')?.getAttribute('content');
  result.last_updated_at = displayDate(summary?.match(/\|最新更新\s*[：:]\s*([^|]+)\|/)?.[1].trim());
  addTags(result, detail('类型'), doc.querySelectorAll(`${mobileInfo} > li a[href^="/assort/"]`),
    '移动作品页类型及内容标签链接');
  result.evidence.title = `${mobileTitle}[data-novelname]`;
  result.evidence.authors = visibleAuthor ? authorSelector : `${mobileTitle}[data-authorname]`;
  if (result.serialization_status) result.evidence.serialization_status = `${mobileInfo} 状态`;
  if (result.word_count_text) result.evidence.word_count_text = `${mobileInfo} 状态中的字数`;
  if (result.last_updated_at) result.evidence.last_updated_at = 'meta[name="description"] 的最新更新（作品更新时间）';
}

export const jjwxcAdapter = {
  provider: 'jjwxc',
  name: '晋江文学城',
  recoveryHint: '请正常打开桌面或移动作品页，使用浏览器采集书签，或选择另存的 HTML 文件。',
  browserCapture: true,
  matchUrl(url: URL): BookRef | undefined {
    let id: string | undefined;
    if (url.hostname === 'www.jjwxc.net' && url.pathname === '/onebook.php' && !url.searchParams.has('chapterid')) {
      const ids = url.searchParams.getAll('novelid');
      if (ids.length === 1 && /^\d+$/.test(ids[0])) id = ids[0];
    }
    if (url.hostname === 'm.jjwxc.net') id = /^\/book2\/(\d+)\/?$/.exec(url.pathname)?.[1];
    return id ? { provider: 'jjwxc', id, url: `https://www.jjwxc.net/onebook.php?novelid=${id}` } : undefined;
  },
  identities(doc: Document, ref: BookRef, resolveUrl: ResolveUrl) {
    const { identities, addUrl } = pageIdentities(doc, ref, resolveUrl);
    addUrl(doc.querySelector(wapIdentity)?.getAttribute('href'), `${wapIdentity}[href]`);
    const id = doc.querySelector(mobileTitle)?.getAttribute('data-novelid');
    if (id && /^\d+$/.test(id)) {
      identities.push({ book: { ...ref, id }, evidence: `${mobileTitle}[data-novelid]` });
    }
    return identities;
  },
  parse(doc: Document, ref: BookRef): SourceFields {
    const result: SourceFields = { title: '', authors: [], evidence: {}, warnings: [] };
    const heading = doc.querySelector(mobileTitle);
    if (heading) parseMobile(doc, heading, result);
    else parseDesktop(doc, ref, result);
    return result;
  },
} as const satisfies SourceAdapter;

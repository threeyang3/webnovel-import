import type { BookRef } from '../types';
import type { SourceAdapter, SourceFields, ResolveUrl } from './types';
import { clean, text, textWithBreaks, meta, imageUrl, status, pageIdentities } from './shared';

export const qidianAdapter = {
  provider: 'qidian',
  name: '起点中文网',
  recoveryHint: '请正常打开作品页，使用设置中的浏览器采集书签，或选择另存的 HTML 文件。',
  browserCapture: true,
  matchUrl(url: URL): BookRef | undefined {
    const pattern = url.hostname === 'book.qidian.com' ? /^\/info\/(\d+)\/?$/
      : ['www.qidian.com', 'm.qidian.com'].includes(url.hostname) ? /^\/book\/(\d+)\/?$/ : undefined;
    const id = pattern?.exec(url.pathname)?.[1];
    return id ? { provider: 'qidian', id, url: `https://www.qidian.com/book/${id}/` } : undefined;
  },
  identities(doc: Document, ref: BookRef, resolveUrl: ResolveUrl) {
    const { identities } = pageIdentities(doc, ref, resolveUrl);
    const id = doc.querySelector('#book-detail #bookImg')?.getAttribute('data-bid');
    if (id && /^\d+$/.test(id)) {
      identities.push({ book: { ...ref, id }, evidence: '#book-detail #bookImg[data-bid]' });
    }
    return identities;
  },
  parse(doc: Document, ref: BookRef): SourceFields {
    const result: SourceFields = { title: '', authors: [], evidence: {}, warnings: [] };
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
    return result;
  },
} as const satisfies SourceAdapter;

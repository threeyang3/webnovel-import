import type { BookRef } from '../types';
import type { ResolveUrl, SourceAdapter, SourceFields } from './types';
import { clean, imageUrl, pageIdentities, status, text, textWithBreaks } from './shared';

const headerSelector = '.book-information';
const titleSelector = '.wrap-txt > .title > .txt';
const authorSelector = '.sub-title .txt';
const chapterSelector = '.update-info .update-chapter-title a';
const updateSelector = '.update-info .update-time';
const descriptionSelector = '.book-introduction .intro';

export const qimaoAdapter = {
  provider: 'qimao',
  name: '七猫中文网',
  recoveryHint: '请正常打开作品页，使用浏览器采集书签，或选择另存的 HTML 文件。',
  browserCapture: true,
  matchUrl(url: URL): BookRef | undefined {
    const id = url.hostname === 'www.qimao.com' ? /^\/shuku\/(\d+)\/?$/.exec(url.pathname)?.[1] : undefined;
    return id ? { provider: 'qimao', id, url: `https://www.qimao.com/shuku/${id}/` } : undefined;
  },
  identities(doc: Document, ref: BookRef, resolveUrl: ResolveUrl) {
    const { identities, addUrl } = pageIdentities(doc, ref, resolveUrl);
    const href = doc.querySelector(`${headerSelector} ${chapterSelector}`)?.getAttribute('href');
    if (href) {
      try {
        // The latest chapter inside the book's own header links to its catalog ID.
        const chapter = new URL(href, ref.url);
        const match = /^\/shuku\/(\d+)-\d+\/?$/.exec(chapter.pathname);
        if (match) {
          chapter.pathname = `/shuku/${match[1]}/`;
          addUrl(chapter.href, `${headerSelector} ${chapterSelector}[href] 的作品 ID`);
        }
      } catch { /* A malformed chapter link is not identity evidence. */ }
    }
    return identities;
  },
  parse(doc: Document, ref: BookRef): SourceFields {
    const result: SourceFields = { title: '', authors: [], evidence: {}, warnings: [] };
    const header = doc.querySelector(headerSelector);
    if (!header) return result;
    result.title = text(header, titleSelector) || '';
    const author = Array.from(header.querySelectorAll(authorSelector)).find(el => /^作者\s*[：:]/.test(clean(el.textContent) ?? ''));
    const name = author && text(author, 'em a');
    if (name) result.authors = [name];
    result.description = textWithBreaks(doc, descriptionSelector);
    const cover = imageUrl(header.querySelector('.wrap-pic > img')?.getAttribute('src'), ref.url);
    if (cover && /^https?:\/\/cdn\.qimao\.com\/bookimg\/[^?#]*\/readerCover\//.test(cover)) {
      result.cover_url = cover;
    }
    const tags = Array.from(header.querySelectorAll('.tags-wrap a[href*="/shuku/a-"]'))
      .map(link => clean(link.textContent)).filter((tag): tag is string => Boolean(tag));
    if (tags.length) result.tags = [...new Set(tags)];
    result.serialization_status = Array.from(header.querySelectorAll('.tags-wrap > .qm-tag'))
      .map(tag => status(clean(tag.textContent))).find(value => value !== undefined);
    result.word_count_text = Array.from(header.querySelectorAll('.statistics-wrap > .txt'))
      .map(el => clean(el.textContent)?.replace(/\s/g, '')).find(value => value && /^\d[\d,.]*(?:万|亿)?字$/.test(value));
    result.last_updated_at = text(header, updateSelector);
    result.latest_chapter = text(header, chapterSelector);

    result.evidence.title = `${headerSelector} ${titleSelector}`;
    result.evidence.authors = `${headerSelector} ${authorSelector}（作者标签） em a`;
    if (result.description) result.evidence.description = descriptionSelector;
    if (result.cover_url) result.evidence.cover_url = `${headerSelector} .wrap-pic > img[src]，作品封面路径`;
    if (result.tags) result.evidence.tags = `${headerSelector} .tags-wrap 内书库分类链接`;
    if (result.serialization_status) result.evidence.serialization_status = `${headerSelector} .tags-wrap > .qm-tag`;
    if (result.word_count_text) result.evidence.word_count_text = `${headerSelector} .statistics-wrap > .txt（字数）`;
    if (result.last_updated_at) result.evidence.last_updated_at = `${headerSelector} ${updateSelector}（最新章节时间）`;
    if (result.latest_chapter) result.evidence.latest_chapter = `${headerSelector} ${chapterSelector}`;
    return result;
  },
} as const satisfies SourceAdapter;

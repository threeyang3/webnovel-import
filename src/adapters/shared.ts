import type { BookRef, SourceMetadata } from '../types';
import type { ResolveUrl } from './types';

export const clean = (value: string | null | undefined): string | undefined =>
  value?.replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ').trim() || undefined;

export function text(root: ParentNode, selector: string): string | undefined {
  return clean(root.querySelector(selector)?.textContent);
}

export function textWithBreaks(root: ParentNode, selector: string): string | undefined {
  const element = root.querySelector(selector);
  if (!element) return undefined;
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  copy.querySelectorAll('script, style').forEach(node => node.remove());
  return clean(copy.textContent?.replace(/\r\n?/g, '\n').replace(/[\t ]*\n[\t ]*/g, '\n'));
}

export function meta(doc: Document, key: string): string | undefined {
  return clean(doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content'));
}

export function imageUrl(value: string | null | undefined, base: string): string | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim(), base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function status(value: string | undefined): SourceMetadata['serialization_status'] {
  if (!value) return undefined;
  if (/完结|完本|已完成/.test(value)) return 'completed';
  if (/暂停|停更|断更/.test(value)) return 'paused';
  if (/连载/.test(value)) return 'ongoing';
  return undefined;
}

export interface Identity { book: BookRef; evidence: string }

export function pageIdentities(doc: Document, ref: BookRef, resolveUrl: ResolveUrl) {
  const identities: Identity[] = [];
  const addUrl = (value: string | null | undefined, evidence: string): void => {
    if (!value) return;
    try { identities.push({ book: resolveUrl(new URL(value, ref.url).href), evidence }); }
    catch { /* A homepage, author or other non-book URL is not book identity evidence. */ }
  };
  addUrl(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'), 'link[rel="canonical"]');
  for (const key of ['og:url', 'og:novel:book_url', 'og:novel:read_url']) addUrl(meta(doc, key), `meta ${key}`);
  return { identities, addUrl };
}

export function validateIdentities(identities: Identity[], ref: BookRef): string {
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

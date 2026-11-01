import type { BookRef, SourceMetadata } from './types';
import type { SourceAdapter } from './adapters/types';
import { qidianAdapter } from './adapters/qidian';
import { fanqieAdapter } from './adapters/fanqie';
import { validateIdentities } from './adapters/shared';

/** Register a verified platform here; importing, merging and Vault writes stay unchanged. */
export const sourceAdapters = [qidianAdapter, fanqieAdapter] as const;
export type Provider = typeof sourceAdapters[number]['provider'];

export function getSourceAdapter(provider: string): SourceAdapter {
  const adapter = sourceAdapters.find(adapter => adapter.provider === provider);
  if (!adapter) throw new Error(`不支持的作品来源：${provider}`);
  return adapter;
}

export const providerName = (provider: Provider): string => getSourceAdapter(provider).name;

/** Resolve a book detail URL, never a search result or chapter URL. */
export function parseBookUrl(input: string): BookRef {
  let url: URL;
  try { url = new URL(input.trim()); }
  catch { throw new Error('请输入完整的作品详情页链接。'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('作品链接必须是普通的 HTTP 或 HTTPS 官网链接。');
  }
  for (const adapter of sourceAdapters) {
    const ref = adapter.matchUrl(url);
    if (ref) return ref;
  }
  throw new Error(`仅支持${sourceAdapters.map(a => a.name).join('、')}作品详情页；请勿使用章节或搜索页链接。`);
}

export function parseSourceHtml(
  html: string, ref: BookRef, acquisition: 'remote' | 'html' | 'browser' = 'remote',
): SourceMetadata {
  const adapter = getSourceAdapter(ref.provider);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const identity = validateIdentities(adapter.identities(doc, ref, parseBookUrl), ref);
  const fields = adapter.parse(doc, ref, parseBookUrl);
  const result: SourceMetadata = {
    ...fields, ...ref, fetched_at: new Date().toISOString(), acquisition,
    evidence: { identity, ...fields.evidence },
  };
  if (!result.title || result.authors.length === 0) {
    throw new Error('未识别到可靠的书名和作者。页面可能是验证页、登录页或结构已变化；请在浏览器确认作品详情页，或使用手动建档。');
  }
  if (!result.cover_url) result.warnings.push('未提取到可用封面地址，可稍后手动补充。');
  if (!result.description) result.warnings.push('未提取到作品简介，可稍后手动补充。');
  // Neither latest-update dates nor chapter dates establish the work's first publication.
  result.warnings.push('未获得明确的首发日期，首发年份留空；不会用最近更新时间推断年份。');
  return result;
}

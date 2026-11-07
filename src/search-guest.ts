import { browserCaptureBundle, parseCapturedMetadata } from './browser-capture';
import type { SearchProvider } from './search';
import type { BookRef, SourceMetadata } from './types';

export function prepareSearchPageCode(provider: SearchProvider, keyword: string): string {
  return `(() => {${browserCaptureBundle()};WebnovelBrowser.prepareSearchPage(${JSON.stringify(provider)}, ${JSON.stringify(keyword)});})()`;
}

export function readSearchWorkCode(ref: BookRef): string {
  return `(() => {${browserCaptureBundle()};return WebnovelBrowser.readSearchWork(${JSON.stringify(ref.url)});})()`;
}

export function parseSearchWorkResult(result: unknown, ref: BookRef): SourceMetadata {
  if (!result || typeof result !== 'object') throw new Error('网页没有返回作品资料。');
  if ('error' in result && typeof result.error === 'string' && result.error) throw new Error(result.error);
  const metadata = parseCapturedMetadata('metadata' in result ? result.metadata : undefined, ref);
  metadata.evidence.acquisition = '从 Obsidian 官网搜索中选中已打开的作品页';
  return metadata;
}

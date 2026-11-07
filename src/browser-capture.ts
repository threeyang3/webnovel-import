import { getSourceAdapter, parseBookUrl } from './sources';
import type { SourceMetadata } from './types';

declare const __BROWSER_CAPTURE_CODE__: string;

/** This bundle is built from our parser, never from downloaded website scripts. */
export function makeBookmarklet(vault: string): string {
  const script = `void(function(){${__BROWSER_CAPTURE_CODE__};WebnovelBrowser.capture(${JSON.stringify(vault)});})()`;
  return `javascript:${encodeURIComponent(script)}`;
}

export function encodeCapture(metadata: SourceMetadata): string {
  return JSON.stringify({ format: 'webnovel-import-capture', version: 1, metadata });
}

/** Clipboard content is data: accept only the metadata fields used by the import preview. */
export function parseCapturePayload(raw: string, expected?: { provider: string; id: string; capturedAt?: string }): SourceMetadata {
  let packet;
  try { packet = JSON.parse(raw); }
  catch { throw new Error('剪贴板不是网文采集结果。请在正常显示的起点作品页点击采集书签。'); }
  if (packet?.format !== 'webnovel-import-capture' || packet.version !== 1 || !packet.metadata) {
    throw new Error('未识别的浏览器采集格式，请使用当前版本提供的采集书签。');
  }
  const value = packet.metadata;
  const ref = parseBookUrl(typeof value.url === 'string' ? value.url : '');
  if (!getSourceAdapter(ref.provider).browserCapture || value.provider !== ref.provider || value.id !== ref.id || value.acquisition !== 'browser') {
    throw new Error('采集资料的作品标识不一致，请重新采集对应的起点详情页。');
  }
  if (typeof value.title !== 'string' || !value.title.trim() || !Array.isArray(value.authors)
    || !value.authors.length || !value.authors.every((s: unknown) => typeof s === 'string' && s.trim())) {
    throw new Error('采集资料缺少有效书名或作者，请等待作品详情页正常显示后重试。');
  }
  if (typeof value.fetched_at !== 'string' || !Number.isFinite(Date.parse(value.fetched_at))) {
    throw new Error('采集资料缺少有效获取时间，请重新采集。');
  }
  if (expected && (ref.provider !== expected.provider || ref.id !== expected.id
    || (expected.capturedAt !== undefined && value.fetched_at !== expected.capturedAt))) {
    throw new Error('剪贴板内容与刚采集的资料不一致，请重新点击该作品的采集书签。');
  }
  const result: SourceMetadata = {
    ...ref, title: value.title.trim(), authors: value.authors.map((s: string) => s.trim()),
    acquisition: 'browser', fetched_at: value.fetched_at, evidence: {}, warnings: [],
  };
  for (const key of ['description', 'word_count_text', 'last_updated_at', 'latest_chapter'] as const) {
    if (typeof value[key] === 'string' && value[key].trim()) result[key] = value[key].trim();
  }
  if (typeof value.cover_url === 'string' && value.cover_url.trim()) {
    const url = new URL(value.cover_url, ref.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('采集资料中的封面地址无效。');
    }
    result.cover_url = url.href;
  }
  if (Array.isArray(value.tags) && value.tags.every((s: unknown) => typeof s === 'string')) result.tags = value.tags;
  if (['ongoing', 'completed', 'paused', 'unknown'].includes(value.serialization_status)) {
    result.serialization_status = value.serialization_status;
  }
  for (const key of ['identity', 'title', 'authors', 'description', 'cover_url', 'tags', 'serialization_status', 'word_count_text', 'last_updated_at', 'latest_chapter']) {
    const evidence = value.evidence?.[key];
    if (typeof evidence === 'string') result.evidence[key] = evidence;
  }
  result.evidence.acquisition = '用户在正常显示的作品页点击采集书签，经本机剪贴板导入';
  result.warnings = ['浏览器页面采集；不代表普通 HTTP 自动刷新已可用。',
    '未获得明确的作品首发日期，首发年份留空；不会用最近更新时间或章节日期推断年份。'];
  if (!result.cover_url) result.warnings.push('未提取到可用封面地址，可稍后手动补充。');
  if (!result.description) result.warnings.push('未提取到作品简介，可稍后手动补充。');
  return result;
}

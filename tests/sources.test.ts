import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser as TestDOMParser } from 'linkedom';
import { parseBookUrl, parseSourceHtml } from '../src/sources';

Object.defineProperty(globalThis, 'DOMParser', { value: TestDOMParser, configurable: true });

// Minimal synthetic content following the selectors observed in a real Fanqie detail page.
// No novel body or full copyrighted synopsis is retained in this fixture.
const fanqieHtml = `<!doctype html><html><head>
<script type="application/ld+json">{"@id":"https://fanqienovel.com/page/7143038691944959011"}</script>
</head><body><div class="page-header"><div class="page-header-info">
<img class="book-cover-img" src="//p1-tt.byteimg.com/origin/novel-static/cover" />
<div class="info"><div class="info-name"><h1>测试作品</h1></div>
<div class="info-label"><span class="info-label-yellow">已完结</span><span class="info-label-grey">悬疑脑洞</span></div>
<div class="info-count-word"><span class="detail">320.1</span><span class="text">万字</span></div>
<span class="info-last-title">最近更新：<!-- -->测试番外</span><span class="info-last-time">2025-10-31 22:10</span></div>
<div class="author"><div class="author-name-text">测试作者</div><div class="author-desc">作者签名不应成为作品简介。</div></div>
</div></div><div class="page-body"><div class="page-abstract-content"><p>这是合成简介。\n第二段提到 2024 年，不能推导首发年。</p></div></div>
<div class="recommendation">推荐另一部作品</div><div class="comment">用户评论内容</div>
</body></html>`;
const fanqieRef = parseBookUrl('https://fanqienovel.com/page/7143038691944959011');

test('normalizes recognized book URLs while preserving 19-digit identifiers exactly', () => {
  assert.deepEqual(parseBookUrl('https://fanqienovel.com/page/7143038691944959011?x=y#foo'), fanqieRef);
  assert.equal(typeof fanqieRef.id, 'string');
  assert.equal(fanqieRef.id, '7143038691944959011');
  for (const url of ['https://www.qidian.com/book/1010868264/', 'http://book.qidian.com/info/1010868264', 'https://m.qidian.com/book/1010868264']) {
    assert.equal(parseBookUrl(url).url, 'https://www.qidian.com/book/1010868264/');
  }
  for (const url of ['https://fanqienovel.com/reader/7143038691944959011', 'https://fanqienovel.com/keyword/123',
    'https://www.qidian.com.evil.test/book/123/', 'https://user:secret@fanqienovel.com/page/123', 'javascript:alert(1)']) {
    assert.throws(() => parseBookUrl(url));
  }
});

test('extracts only Fanqie book fields and never converts latest-update or synopsis year into first-publication year', () => {
  const book = parseSourceHtml(fanqieHtml, fanqieRef, 'html');
  assert.equal(book.title, '测试作品');
  assert.deepEqual(book.authors, ['测试作者']);
  assert.equal(book.description, '这是合成简介。\n第二段提到 2024 年，不能推导首发年。');
  assert.equal(book.cover_url, 'https://p1-tt.byteimg.com/origin/novel-static/cover');
  assert.deepEqual(book.tags, ['悬疑脑洞']);
  assert.equal(book.serialization_status, 'completed');
  assert.equal(book.word_count_text, '320.1万字');
  assert.equal(book.last_updated_at, '2025-10-31 22:10');
  assert.equal(book.latest_chapter, '测试番外');
  assert.equal(book.first_published_at, undefined);
  assert.equal(book.first_published_year, undefined);
  assert.equal(book.acquisition, 'html');
  assert.match(book.evidence.description, /page-abstract-content/);
});

test('rejects mismatched book HTML and unsafe cover schemes without evaluating scripts', () => {
  assert.throws(() => parseSourceHtml(fanqieHtml, parseBookUrl('https://fanqienovel.com/page/7143038691944959012')), /不一致/);
  const unsafe = fanqieHtml.replace('//p1-tt.byteimg.com/origin/novel-static/cover', 'javascript:alert(1)');
  assert.equal(parseSourceHtml(unsafe, fanqieRef).cover_url, undefined);
});

test('uses the book-identified JSON-LD image instead of Fanqie\'s grey loading placeholder or author avatar', () => {
  const placeholder = '//p1-tt.byteimg.com/origin/novel-static/5cb03bd354145bc7815a5e09d4b15cfc';
  const actualCover = 'https://p9-novel-sign.byteimg.com/novel-pic/test-cover.image?x-signature=example';
  const page = fanqieHtml
    .replace('//p1-tt.byteimg.com/origin/novel-static/cover', placeholder)
    .replace('"@id":"https://fanqienovel.com/page/7143038691944959011"',
      `"@id":"https://fanqienovel.com/page/7143038691944959011","images":["${actualCover}"]`)
    .replace('<div class="author">', '<div class="author"><img class="author-img" src="https://example.com/avatar.jpg">');
  const book = parseSourceHtml(page, fanqieRef);
  assert.equal(book.cover_url, actualCover);
  assert.match(book.evidence.cover_url, /JSON-LD/);
  const noActualCover = fanqieHtml.replace('//p1-tt.byteimg.com/origin/novel-static/cover', placeholder);
  assert.equal(parseSourceHtml(noActualCover, fanqieRef).cover_url, undefined);
});

test('does not emit an unknown status when an optional status field is absent or unrecognized', () => {
  for (const value of ['', '待确认']) {
    const book = parseSourceHtml(fanqieHtml.replace('已完结', value), fanqieRef);
    assert.equal(book.serialization_status, undefined);
    assert.equal(book.evidence.serialization_status, undefined);
  }
});

test('requires explicit Qidian novel metadata; challenge and generic page titles do not count as books', () => {
  const ref = parseBookUrl('https://www.qidian.com/book/1010868264/');
  const html = `<meta property="og:novel:book_name" content="合成起点作品">
    <meta property="og:novel:author" content="合成作者">
    <meta property="og:novel:status" content="连载">
    <meta property="og:description" content="合成简介">
    <meta property="og:novel:update_time" content="2026-11-01 12:00:00">`;
  const book = parseSourceHtml(html, ref);
  assert.equal(book.title, '合成起点作品');
  assert.equal(book.serialization_status, 'ongoing');
  assert.equal(book.first_published_year, undefined);
  assert.ok(book.warnings.some(warning => warning.includes('尚未验证成功')));
  assert.throws(() => parseSourceHtml('<html><head><script src="/C2WF946J0/probe.js"></script></head><body></body></html>', ref), /未识别/);
  assert.throws(() => parseSourceHtml('<title>安全验证</title><h1>欢迎访问</h1><meta name="author" content="网站">', ref), /未识别/);
});

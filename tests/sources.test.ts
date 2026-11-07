import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser as TestDOMParser } from 'linkedom';
import { decodeHtmlBytes, getSourceAdapter, parseBookUrl, parseSourceHtml } from '../src/sources';

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
const qidianRef = parseBookUrl('https://www.qidian.com/book/1010868264/');
// Synthetic text in the DOM structure observed in the actual rendered Qidian page.
// The real downloaded page is deliberately kept outside the repository.
const qidianMeta = `<meta property="og:novel:book_name" content="元标签书名">
  <meta property="og:novel:author" content="元标签作者">
  <meta property="og:novel:read_url" content="https://www.qidian.com/book/1010868264/">
  <meta property="og:image" content="//bookcover.yuewen.com/qdbimg/349573/1010868264/180.webp">
  <meta property="og:novel:status" content="连载">
  <meta property="og:description" content="元标签简介">
  <meta property="og:novel:update_time" content="2026-11-01 12:00:00">`;
const qidianVisible = `<!doctype html><html><head>${qidianMeta}
  <script type="application/ld+json">{"@type":"Book","@id":"https://www.qidian.com/book/999/","image":"https://example.com/recommendation.jpg"}</script>
  </head><body><div id="book-detail">
  <a id="bookImg" data-bid="1010868264"><img src="//bookcover.yuewen.com/qdbimg/349573/1010868264/600.webp"></a>
  <div class="book-info-top"><h1 id="bookName">页面书名</h1>
  <p class="book-meta"><span class="author">作者:页面作者</span><span class="update-time">更新时间:2025-01-02 03:04:05</span></p>
  <a class="book-latest-chapter">最新章节: 测试番外</a>
  <p class="book-attribute"><span>完本</span><span class="dot">·</span><span>签约</span><span>VIP</span>
  <a>玄幻</a><a>异世大陆</a><a>轻小说</a></p>
  <p class="intro">分类宣传语，不是作品简介。</p>
  <p class="count"><em>446.77万</em><cite>字</cite><em>999万</em><cite>总推荐</cite></p>
  </div></div><p id="book-intro-detail">测试简介第一段。<br>第二段提到2020年。<br>第三段。</p>
  <div class="recommendation"><h1>推荐书名</h1><img src="https://example.com/other.jpg"></div>
  </body></html>`;

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

test('uses the verified Qidian book DOM, preserving synopsis breaks and ignoring recommendations', () => {
  const book = parseSourceHtml(qidianVisible, qidianRef, 'browser');
  assert.equal(book.title, '页面书名');
  assert.deepEqual(book.authors, ['页面作者']);
  assert.equal(book.description, '测试简介第一段。\n第二段提到2020年。\n第三段。');
  assert.equal(book.cover_url, 'https://bookcover.yuewen.com/qdbimg/349573/1010868264/600.webp');
  assert.deepEqual(book.tags, ['玄幻', '异世大陆', '轻小说']);
  assert.equal(book.serialization_status, 'completed');
  assert.equal(book.word_count_text, '446.77万字');
  assert.equal(book.last_updated_at, '2025-01-02 03:04:05');
  assert.equal(book.latest_chapter, '测试番外');
  assert.equal(book.first_published_at, undefined);
  assert.equal(book.first_published_year, undefined);
  assert.equal(book.acquisition, 'browser');
  assert.match(book.evidence.description, /book-intro-detail/);
  assert.match(book.evidence.identity, /read_url/);
});

test('keeps explicit Qidian novel metadata as a fallback when its read URL establishes identity', () => {
  const book = parseSourceHtml(qidianMeta, qidianRef, 'html');
  assert.equal(book.title, '元标签书名');
  assert.deepEqual(book.authors, ['元标签作者']);
  assert.equal(book.description, '元标签简介');
  assert.equal(book.cover_url, 'https://bookcover.yuewen.com/qdbimg/349573/1010868264/180.webp');
  assert.equal(book.serialization_status, 'ongoing');
  assert.equal(book.first_published_year, undefined);
  assert.equal(book.warnings.some(warning => warning.includes('尚未验证成功')), false);
});

test('rejects missing or conflicting current-book identity, challenge pages and recommendation-only identity', () => {
  const noIdentity = qidianMeta.replace(/<meta property="og:novel:read_url"[^>]+>/, '');
  assert.throws(() => parseSourceHtml(noIdentity, qidianRef, 'html'), /作品标识/);
  assert.throws(() => parseSourceHtml(noIdentity, qidianRef, 'remote'), /作品标识/);
  assert.throws(() => parseSourceHtml(qidianMeta.replace('/book/1010868264/', '/book/1010868265/'), qidianRef), /不一致/);
  assert.throws(() => parseSourceHtml(qidianVisible.replace('data-bid="1010868264"', 'data-bid="1010868265"'), qidianRef), /不一致/);
  const recommendationOnly = `${noIdentity}<script type="application/ld+json">{"itemListElement":[{"@id":"https://www.qidian.com/book/1010868264/"}]}</script>`;
  assert.throws(() => parseSourceHtml(recommendationOnly, qidianRef, 'html'), /作品标识/);
  assert.throws(() => parseSourceHtml('<html><head><script src="/C2WF946J0/probe.js"></script></head><body></body></html>', qidianRef), /未识别/);
  assert.throws(() => parseSourceHtml('<title>安全验证</title><h1>欢迎访问</h1><meta name="author" content="网站">', qidianRef), /未识别/);
});


test('registry rejects unknown sources and cross-platform identities instead of falling back to Qidian', () => {
  assert.throws(() => getSourceAdapter('unsupported'), /不支持/);
  const conflicting = qidianVisible.replace('<head>', '<head><link rel="canonical" href="https://fanqienovel.com/page/1010868264">');
  assert.throws(() => parseSourceHtml(conflicting, qidianRef), /不一致/);
  assert.equal(getSourceAdapter('fanqie').browserCapture, undefined);
});

test('normalizes Qimao and Jinjiang detail URLs, rejecting search, chapter and ambiguous links', () => {
  const id = '000000000000000000001';
  assert.deepEqual(parseBookUrl(`http://www.qimao.com/shuku/${id}?foo=bar`), {
    provider: 'qimao', id, url: `https://www.qimao.com/shuku/${id}/`,
  });
  const novel = { provider: 'jjwxc', id, url: `https://www.jjwxc.net/onebook.php?novelid=${id}` };
  assert.deepEqual(parseBookUrl(`${novel.url}&foo=bar`), novel);
  assert.deepEqual(parseBookUrl(`https://m.jjwxc.net/book2/${id}/`), novel);
  for (const url of [
    'https://www.qimao.com/search/index/?keyword=123', 'https://www.qimao.com/shuku/123-456/',
    'https://www.qimao.com/shuku/a-123/', 'https://www.qimao.com.example/shuku/123/',
    'https://my.jjwxc.net/search.php?novelid=123', 'https://www.jjwxc.net/onebook.php?novelid=123&chapterid=1',
    'https://www.jjwxc.net/onebook.php?novelid=123&novelid=456', 'https://m.jjwxc.net/book2/123/1',
  ]) assert.throws(() => parseBookUrl(url), /作品详情页/);
});

// Synthetic metadata in the observed official desktop and mobile layouts.
const qimaoRef = parseBookUrl('https://www.qimao.com/shuku/195958/');
const qimaoDetail = `<!doctype html><html><body><div class="book-information clearfix left">
  <div class="wrap-pic"><img src="https://cdn.qimao.com/bookimg/zww/upload/readerCover/1/test.jpg"></div>
  <div class="wrap-txt"><div class="title"><span class="txt">七猫测试书</span></div>
  <div class="sub-title"><span class="txt">作者：<em><a href="/zuozhe/test">测试作者</a></em></span></div>
  <div class="tags-wrap"><span class="qm-tag">连载中</span><span class="qm-tag">签约作品</span>
  <a href="/shuku/a-1">都市</a><a href="/shuku/a-2">都市修真</a></div>
  <div class="statistics-wrap"><span class="txt">21.3万字</span><span class="txt">10万人气</span></div>
  <div class="update-info"><div class="update-chapter-title"><a href="/shuku/195958-123/">测试最新章</a></div>
  <span class="update-time">2026-11-07 12:30:00</span></div></div></div>
  <div class="book-introduction"><p class="intro">测试简介。<br>在 2022 年发生。<script>throw '不执行';</script></p>
  <div>小说正文不得作为简介。</div></div>
  <section><a href="/shuku/999-100/">推荐另一作品</a><img src="https://example.com/avatar.jpg"></section></body></html>`;

test('extracts Qimao detail metadata from the identified work header and synopsis', () => {
  const book = parseSourceHtml(qimaoDetail, qimaoRef, 'browser');
  assert.equal(book.title, '七猫测试书');
  assert.deepEqual(book.authors, ['测试作者']);
  assert.equal(book.description, '测试简介。\n在 2022 年发生。');
  assert.equal(book.cover_url, 'https://cdn.qimao.com/bookimg/zww/upload/readerCover/1/test.jpg');
  assert.deepEqual(book.tags, ['都市', '都市修真']);
  assert.equal(book.serialization_status, 'ongoing');
  assert.equal(book.word_count_text, '21.3万字');
  assert.equal(book.latest_chapter, '测试最新章');
  assert.equal(book.last_updated_at, '2026-11-07 12:30:00');
  assert.equal(book.first_published_year, undefined);
  assert.match(book.evidence.identity, /update-chapter-title/);
  assert.equal(parseSourceHtml(qimaoDetail.replace('bookimg/zww/upload/readerCover/1/test.jpg', 'default.jpg'),
    qimaoRef).cover_url, undefined);
  assert.throws(() => parseSourceHtml(qimaoDetail.replace('/shuku/195958-123/', '/shuku/999-123/'), qimaoRef), /不一致/);
  assert.throws(() => parseSourceHtml(qimaoDetail.replace('class="update-info"', 'class="recommendations"'), qimaoRef), /作品标识/);
});

const jjwxcRef = parseBookUrl('https://www.jjwxc.net/onebook.php?novelid=1661930');
const jjwxcDesktop = `<!doctype html><html><body itemtype="http://schema.org/Novel">
  <meta itemprop="dateModified" content="2024-04-08 18:30:25">
  <table><tr><td class="sptd"><h1 class="bigtext" itemprop="name"><span itemprop="articleSection">晋江测试文</span></h1>
  <h2>作者：<span itemprop="author">测试作者</span></h2></td></tr>
  <tr><td class="readtd"><a href="https://m.jjwxc.net/book2/1661930">手机版</a></td></tr>
  <tr><td><div class="smallreadbody">
  <img itemprop="image" class="noveldefaultimage" src="https://i9-static.jjwxc.net/novelimage.php?novelid=1661930&amp;coverid=20"
    _src="https://i9-static.jjwxc.net/novelimage.php?novelid=1661930&amp;coverid=20">
  <div id="novelintro" itemprop="description">测试文案。<br>第二行提到 2020 年。</div>
  <a href="//www.jjwxc.net/bookbase.php?bq=262">轻松</a></div>
  <span itemprop="genre">原创-言情-近代现代-爱情</span>
  <span itemprop="updataStatus">完结</span><span itemprop="wordCount">58004字</span></td></tr>
  <tr itemprop="newestChapter"><td itemprop="headline"><a itemprop="url" href="/onebook.php?novelid=1661930&amp;chapterid=20">测试最新章</a></td>
  <td title="章节首发时间：2023-01-01 00:00:00">2024-04-08 18:30:25 &nbsp;*最新更新</td></tr>
  </table><section><a href="/onebook.php?novelid=999">其他作品</a></section></body></html>`;

const jjwxcMobile = `<!doctype html><html><head>
  <meta name="description" content="测试文案|最新更新:2024-04-08 18:30:25|">
  </head><body><div class="b module">
  <h2 class="big"><span class="uninterested-author" data-novelid="1661930" data-novelname="晋江测试文" data-authorname="测试作者"></span></h2></div>
  <div id="info">
  <ul id="left"><li class="authorname-content">作者：<a href="/wapauthor/1">测试作者</a></li>
  <li>类型：原创-言情-近代现代-爱情</li><li>标签：<a href="/assort/262">轻松</a></li>
  <li>状态：已签约/连载/58004字</li></ul></div>
  <div class="b module"><ul><li id="novelintro">缩略文案
  <span id="novelintro_whole">测试文案。<br>第二行提到 2020 年。</span></li></ul></div></body></html>`;

test('extracts Jinjiang desktop and mobile works without borrowing chapter dates or default covers', () => {
  for (const [html, state, chapter] of [
    [jjwxcDesktop, 'completed', '测试最新章'],
    [jjwxcMobile, 'ongoing', undefined],
  ] as const) {
    const book = parseSourceHtml(html, jjwxcRef, 'html');
    assert.equal(book.title, '晋江测试文');
    assert.deepEqual(book.authors, ['测试作者']);
    assert.equal(book.description, '测试文案。\n第二行提到 2020 年。');
    assert.deepEqual(book.tags, ['原创-言情-近代现代-爱情', '轻松']);
    assert.equal(book.serialization_status, state);
    assert.equal(book.word_count_text, '58004字');
    assert.equal(book.latest_chapter, chapter);
    assert.equal(book.last_updated_at, '2024-04-08 18:30:25');
    assert.equal(book.first_published_at, undefined);
    assert.equal(book.cover_url, undefined);
  }
  assert.throws(() => parseSourceHtml(jjwxcDesktop.replace('m.jjwxc.net/book2/1661930', 'm.jjwxc.net/book2/999'),
    jjwxcRef), /不一致/);
  assert.throws(() => parseSourceHtml(jjwxcMobile.replace('data-novelid="1661930"', 'data-novelid="999"'),
    jjwxcRef), /不一致/);
  assert.throws(() => parseSourceHtml('<a href="https://m.jjwxc.net/book2/1661930">搜索结果</a>',
    jjwxcRef), /作品标识/);
  const customCover = 'https://i0-static.jjwxc.net/authorimagespace.php?path=test&imageName=cover.jpg';
  const coverPage = jjwxcDesktop.replace('src="https://i9-static.jjwxc.net/novelimage.php?novelid=1661930&amp;coverid=20"',
    `src="${customCover}"`);
  assert.equal(parseSourceHtml(coverPage, jjwxcRef).cover_url, customCover);
  const wrongDefaultId = coverPage.replace('novelimage.php?novelid=1661930', 'novelimage.php?novelid=999');
  assert.equal(parseSourceHtml(wrongDefaultId, jjwxcRef).cover_url, undefined);
  assert.match(parseSourceHtml(jjwxcDesktop, jjwxcRef).evidence.last_updated_at, /newestChapter.*可见更新时间/);
});

test('keeps short Jinjiang mobile synopsis text when there is no expanded blurb', () => {
  const short = jjwxcMobile.replace(/<li id="novelintro">[\s\S]*?<\/li>/,
    '<li id="novelintro">简介：\n第一段。<br><br>第二段。<button>展开</button><script>throw "不执行"</script></li>');
  const book = parseSourceHtml(short, jjwxcRef, 'html');
  assert.equal(book.description, '第一段。\n\n第二段。');
  assert.match(book.evidence.description, /直接文本/);
});

test('reads Jinjiang GB18030 bytes and UTF-8 browser saves retaining their legacy charset tag', () => {
  const head = '<meta http-equiv="Content-Type" content="text/html; charset=gb18030">';
  const utf8 = new TextEncoder();
  const gb = new Uint8Array([...utf8.encode(head), 0xbd, 0xfa, 0xbd, 0xad]);
  assert.equal(decodeHtmlBytes(gb.buffer), `${head}晋江`);
  assert.equal(decodeHtmlBytes(gb.buffer.slice(-4), 'text/html; charset=gb18030'), '晋江');
  assert.equal(decodeHtmlBytes(utf8.encode(`${head}晋江`).buffer), `${head}晋江`);
});

test('built bookmarklet uses the live document and returns a validated capture for each supported platform', async () => {
  const { build } = await import('esbuild');
  const { parseHTML } = await import('linkedom');
  const { createContext, runInContext } = await import('node:vm');
  const { parseCapturePayload } = await import('../src/browser-capture');
  const bundle = await build({ entryPoints: ['src/bookmarklet.ts'], bundle: true,
    format: 'iife', globalName: 'WebnovelBrowser', write: false });
  const vault = 'Webnovel Intake QA + 测试';
  for (const [html, url, title] of [
    [qidianVisible, 'https://m.qidian.com/book/1010868264', '页面书名'],
    [qimaoDetail, qimaoRef.url, '七猫测试书'],
    [jjwxcDesktop, jjwxcRef.url, '晋江测试文'],
    [jjwxcMobile, 'https://m.jjwxc.net/book2/1661930', '晋江测试文'],
  ]) {
    let payload = '';
    let uri = '';
    const context = createContext({
      document: parseHTML(html).document, URL, URLSearchParams,
      location: { href: url, assign: (value: string) => { uri = value; } },
      navigator: { clipboard: { writeText: async (value: string) => { payload = value; } } },
      window: { alert: (message: string) => { throw new Error(message); } },
    });
    runInContext(bundle.outputFiles[0].text, context);
    await runInContext(`WebnovelBrowser.capture(${JSON.stringify(vault)})`, context);
    const callback = new URL(uri);
    const ref = parseBookUrl(url);
    assert.equal(callback.protocol, 'obsidian:');
    assert.equal(callback.searchParams.get('provider'), ref.provider);
    assert.equal(callback.searchParams.get('id'), ref.id);
    // Obsidian percent-decodes values without treating "+" as a space.
    const rawVault = callback.search.slice(1).split('&').find(part => part.startsWith('vault='));
    assert.equal(rawVault, `vault=${encodeURIComponent(vault)}`);
    const result = parseCapturePayload(payload, { ...ref, capturedAt: callback.searchParams.get('capturedAt') ?? '' });
    assert.equal(result.title, title);
    assert.equal(result.url, ref.url);
    assert.equal(result.acquisition, 'browser');
    assert.equal(result.first_published_year, undefined);
    assert.ok(result.description?.includes('\n'));
  }
});

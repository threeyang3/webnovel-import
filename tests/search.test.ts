import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { parseHTML } from 'linkedom';
import { createContext, runInContext } from 'node:vm';
import { isOfficialSearchPage, officialSearch, searchProviders } from '../src/search';
import { parseSearchWorkResult } from '../src/search-guest';
import { parseBookUrl } from '../src/sources';

test('four official search actions encode keywords and never identify a Work', () => {
  const keyword = '书名 作者 /?#&+';
  const encoded = encodeURIComponent(keyword);
  assert.deepEqual(Object.keys(searchProviders), ['qidian', 'fanqie', 'qimao', 'jjwxc']);
  const qidian = officialSearch('qidian', ` ${keyword} `);
  const fanqie = officialSearch('fanqie', keyword);
  const qimao = officialSearch('qimao', keyword);
  const jjwxc = officialSearch('jjwxc', keyword);
  assert.deepEqual(qidian, { url: `https://www.qidian.com/so/${encoded}.html` });
  assert.deepEqual(fanqie, { url: `https://fanqienovel.com/search/${encoded}` });
  assert.equal(new URL(qimao.url).pathname, '/search/index/');
  assert.equal(new URL(qimao.url).searchParams.get('keyword'), keyword);
  assert.deepEqual(jjwxc, { url: 'https://my.jjwxc.net/search.php' });
  for (const result of [qidian, fanqie, qimao, jjwxc]) assert.throws(() => parseBookUrl(result.url), /作品详情页/);
  assert.throws(() => officialSearch('qidian', '  '), /关键词/);
});

test('Jinjiang reuses the official form and keeps a clicked book result in the search guest', async () => {
  const { document, Element } = parseHTML(`<html><body>
    <form id="formleft" target="_blank"><input id="autoComplete" name="kw"></form>
    <a id="work" href="http://www.jjwxc.net/onebook.php?novelid=2135388" target="_blank"><span>测试书</span></a>
    <a id="chapter" href="https://www.jjwxc.net/onebook.php?novelid=2135388&chapterid=1">章节</a>
    <a id="other" href="https://www.qidian.com/book/1010868264/">其他平台</a>
  </body></html>`);
  const code = await build({ entryPoints: ['src/bookmarklet.ts'], bundle: true, format: 'iife',
    globalName: 'WebnovelBrowser', write: false });
  const clicks: Array<(event: unknown) => void> = [];
  const navigation: string[] = [];
  const location = { href: 'https://my.jjwxc.net/search.php', assign: (url: string) => navigation.push(url) };
  const context = createContext({
    document, Element, URL, location,
    window: { addEventListener: (_name: string, handle: (event: unknown) => void) => clicks.push(handle) },
  });
  runInContext(code.outputFiles[0].text, context);
  runInContext('WebnovelBrowser.prepareSearchPage("jjwxc", "红楼邢氏")', context);
  assert.equal(document.querySelector<HTMLInputElement>('input')?.value, '红楼邢氏');
  assert.equal(document.querySelector<HTMLFormElement>('form')?.target, '_self');
  location.href = 'https://www.jjwxc.net/search.php?version=1&t=1';
  runInContext('WebnovelBrowser.prepareSearchPage("jjwxc", "红楼邢氏")', context);
  assert.equal(clicks.length, 1);
  for (const [selector, isTrusted] of [['#chapter', true], ['#other', true], ['#work span', false], ['#work span', true]] as const) {
    clicks[0]({ isTrusted, button: 0, target: document.querySelector(selector),
      preventDefault() {}, stopImmediatePropagation() {} });
  }
  assert.deepEqual(navigation, ['https://www.jjwxc.net/onebook.php?novelid=2135388']);
  assert.equal(isOfficialSearchPage('jjwxc', 'https://my.jjwxc.net.evil.test/search.php'), false);

  const popupCalls: unknown[] = [];
  const fanqieWindow = {
    addEventListener() {},
    open: (url: string) => { popupCalls.push(url); },
  };
  const userActivation = { isActive: false };
  location.href = 'https://fanqienovel.com/search/十日终焉';
  const fanqieContext = createContext({ URL, location, window: fanqieWindow, navigator: { userActivation } });
  runInContext(code.outputFiles[0].text, fanqieContext);
  runInContext('WebnovelBrowser.prepareSearchPage("fanqie", "十日终焉")', fanqieContext);
  const workPath = '/page/7143038691944959011?enter_from=search';
  fanqieWindow.open(workPath);
  userActivation.isActive = true;
  fanqieWindow.open(workPath);
  assert.deepEqual(popupCalls, [workPath]);
  assert.deepEqual(navigation.slice(1), ['https://fanqienovel.com/page/7143038691944959011']);
});

test('an embedded search result validates the selected work and supports Fanqie without a bookmarklet', () => {
  const ref = parseBookUrl('https://fanqienovel.com/page/7143038691944959011');
  const packet = { metadata: {
    ...ref, title: '测试书', authors: ['测试作者'], acquisition: 'browser',
    fetched_at: '2026-11-07T08:00:00Z', first_published_year: 2024,
    evidence: { identity: '作品页结构化资料' },
  } };
  const result = parseSearchWorkResult(packet, ref);
  assert.equal(result.id, '7143038691944959011');
  assert.equal(result.first_published_year, undefined);
  assert.match(result.evidence.acquisition, /官网搜索/);
  assert.throws(() => parseSearchWorkResult(packet, parseBookUrl('https://fanqienovel.com/page/7143038691944959012')), /标识不一致/);
});

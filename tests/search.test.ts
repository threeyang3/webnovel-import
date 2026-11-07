import test from 'node:test';
import assert from 'node:assert/strict';
import { officialSearch, searchProviders } from '../src/search';
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
  assert.deepEqual(jjwxc, { url: 'https://my.jjwxc.net/search.php', copyKeyword: keyword });
  for (const result of [qidian, fanqie, qimao, jjwxc]) assert.throws(() => parseBookUrl(result.url), /作品详情页/);
  assert.throws(() => officialSearch('qidian', '  '), /关键词/);
});

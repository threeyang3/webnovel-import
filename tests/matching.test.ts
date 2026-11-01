import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesWork } from '../src/matching';

test('candidates require full title and author-set equality, including manual sourceless works', () => {
  const incoming = { title: '测试作品', authors: ['作者甲', '作者乙'] };
  assert.equal(matchesWork({title: ' 测试作品 ', authors: ['作者乙', '作者甲']}, incoming), true);
  for (const local of [
    {title: '测试作品', authors: ['作者甲']},
    {title: '测试作品', authors: ['其他作者']},
    {title: '测试作品续集', authors: incoming.authors},
    {title: '测试作品'}, {title: '测试作品', authors: []},
    {title: '测试作品', authors: [42]},
  ]) assert.equal(matchesWork(local, incoming), false);
  assert.equal(matchesWork({title: 'Ａ Book', authors: ' Alice '}, {title: 'a  book', authors: ['alice']}), true);
  assert.equal(matchesWork({title: '', authors: ['作者']}, {title: '', authors: ['作者']}), false);
});

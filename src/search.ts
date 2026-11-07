export const searchProviders = {
  qidian: { name: '起点中文网', hint: '按书名或作者搜索。' },
  fanqie: { name: '番茄小说', hint: '按书名或作者搜索。' },
  qimao: { name: '七猫中文网', hint: '按书名、作者或主角搜索。' },
  jjwxc: { name: '晋江文学城', hint: '打开官网表单后选择“作品”或“作者”，再点搜索。' },
} as const;

export type SearchProvider = keyof typeof searchProviders;

export function isOfficialSearchPage(provider: SearchProvider, input: string): boolean {
  let url: URL;
  try { url = new URL(input); }
  catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  switch (provider) {
    case 'qidian':
      return url.hostname === 'www.qidian.com' && url.pathname.startsWith('/so/');
    case 'fanqie':
      return url.hostname === 'fanqienovel.com' && (url.pathname.startsWith('/search/') || url.pathname === '/');
    case 'qimao':
      return url.hostname === 'www.qimao.com' && /^\/search\/index\/?$/.test(url.pathname);
    case 'jjwxc':
      return ['my.jjwxc.net', 'www.jjwxc.net'].includes(url.hostname) && url.pathname === '/search.php';
  }
}

export function officialSearch(provider: SearchProvider, input: string): { url: string } {
  const keyword = input.trim();
  if (!keyword) throw new Error('请输入书名或作者关键词。');
  const encoded = encodeURIComponent(keyword);
  switch (provider) {
    case 'qidian':
      return { url: `https://www.qidian.com/so/${encoded}.html` };
    case 'fanqie':
      // A dot-only URL segment would be resolved by the browser as a relative path.
      return keyword === '.' || keyword === '..'
        ? { url: 'https://fanqienovel.com/' }
        : { url: `https://fanqienovel.com/search/${encoded}` };
    case 'qimao':
      return { url: `https://www.qimao.com/search/index/?keyword=${encoded}` };
    case 'jjwxc':
      return { url: 'https://my.jjwxc.net/search.php' };
  }
}

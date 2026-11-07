export const searchProviders = {
  qidian: { name: '起点中文网', hint: '按书名或作者搜索。' },
  fanqie: { name: '番茄小说', hint: '按书名或作者搜索。' },
  qimao: { name: '七猫中文网', hint: '按书名、作者或主角搜索。' },
  jjwxc: { name: '晋江文学城', hint: '官网会生成动态参数。粘贴关键词后选择“作品”或“作者”。' },
} as const;

export type SearchProvider = keyof typeof searchProviders;

export function officialSearch(provider: SearchProvider, input: string): { url: string; copyKeyword?: string } {
  const keyword = input.trim();
  if (!keyword) throw new Error('请输入书名或作者关键词。');
  const encoded = encodeURIComponent(keyword);
  switch (provider) {
    case 'qidian':
      return { url: `https://www.qidian.com/so/${encoded}.html` };
    case 'fanqie':
      // A dot-only URL segment would be resolved by the browser as a relative path.
      return keyword === '.' || keyword === '..'
        ? { url: 'https://fanqienovel.com/', copyKeyword: keyword }
        : { url: `https://fanqienovel.com/search/${encoded}` };
    case 'qimao':
      return { url: `https://www.qimao.com/search/index/?keyword=${encoded}` };
    case 'jjwxc':
      return { url: 'https://my.jjwxc.net/search.php', copyKeyword: keyword };
  }
}

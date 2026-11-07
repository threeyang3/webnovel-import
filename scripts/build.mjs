import { build } from 'esbuild';
const capture = await build({ entryPoints: ['src/bookmarklet.ts'], bundle: true, platform: 'browser',
  format: 'iife', globalName: 'WebnovelBrowser', target: 'es2020', minify: true, write: false, logLevel: 'silent' });
await build({entryPoints: ['src/main.ts'], bundle: true, external: ['obsidian', 'electron'], platform: 'browser', format: 'cjs', target: 'es2020', outfile: 'main.js', sourcemap: false, logLevel: 'info',
  define: { __BROWSER_CAPTURE_CODE__: JSON.stringify(capture.outputFiles[0].text) }});

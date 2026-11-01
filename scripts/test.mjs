import { build } from 'esbuild';
import { readdir, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = (await readdir('tests')).filter(f => f.endsWith('.test.ts')).map(f => `tests/${f}`);
await mkdir('.test-build', { recursive: true });
await build({ entryPoints: files, bundle: true, platform: 'node', format: 'cjs', outdir: '.test-build', packages: 'external', logLevel: 'silent' });
const output = files.map(f => `.test-build/${f.split('/').at(-1).replace(/\.ts$/, '.js')}`);
const result = spawnSync(process.execPath, ['--test', ...output], { stdio: 'inherit' });
process.exit(result.status ?? 1);

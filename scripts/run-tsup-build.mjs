#!/usr/bin/env node

import { build } from 'tsup';

const watch = process.argv.includes('--watch');

await build({
  entry: ['src/index.ts', 'src/chains/index.ts', 'src/types/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  outDir: 'dist',
  treeshake: false,
  watch,
});

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  treeshake: true,
  external: ['cheerio'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' })
});

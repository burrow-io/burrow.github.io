// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://burrow-io.github.io',
  base: '/',
  output: 'static',
  build: {
    assets: 'assets'
  }
});

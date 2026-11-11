// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions es código Deno (imports jsr:) que ESLint no puede resolver
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// eslint-config-next's parser ships without `meta`, which makes `next lint` /
// `next build` abort with 'Cannot serialize key "parse" in parser'. Giving it
// a name lets ESLint serialize the config.
const nextConfig = compat.extends('next/core-web-vitals').map(config => {
  const parser = config.languageOptions?.parser;
  if (!parser || parser.meta) return config;
  return {
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parser: { ...parser, meta: { name: 'eslint-config-next/parser' } },
    },
  };
});

const eslintConfig = [
  // Flat config only lints .js/.mjs/.cjs by default — include .jsx/.ts/.tsx
  { files: ['**/*.{js,jsx,mjs,ts,tsx}'] },
  ...nextConfig,
  {
    rules: {
      // Plain quotes in the (German) help texts are fine
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default eslintConfig;

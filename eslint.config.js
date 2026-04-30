const nextConfig = require('eslint-config-next');

module.exports = [
  {
    ignores: [
      'deploy-package/**',
      'start-prod.js',
      'node_modules/**',
      'dist/**',
      '.next/**',
      '*.mjs',
      '*.cjs',
      'packages/*/dist/**',
      'scripts/**',
      'eslint.config.js',
    ],
  },
  ...nextConfig,
];

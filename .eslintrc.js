module.exports = {
  env: {
    node: true,
    es2024: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'script',
  },
  extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    // default: no console in most files
    'no-console': 'error',
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
  },

  // Per-file exceptions
  overrides: [
    // Server code: allow console logging (your app uses console.* extensively)
    {
      files: ['src/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },

    // Workspace and developer scripts: allow console and process.exit
    {
      files: [
        'scripts/**/*.js',
        'workspace/**/*.js',
        'agg_test.js',
        'debug_*.js',
        'inspect_*.js',
        'sync.js',
        'dbTest.js',
      ],
      rules: {
        'no-console': 'off',
        'no-process-exit': 'off',
      },
    },

    // Migrations & seeders: allow extraneous require and ignore migration signatures
    {
      files: [
        'migrations/**',
        'seeders/**',
        'src/migrations/**',
        'src/seeders/**',
        'workspace/migrations/**',
        'workspace/seeders/**',
      ],
      rules: {
        'node/no-extraneous-require': 'off',
        'no-unused-vars': ['warn', { varsIgnorePattern: 'queryInterface|Sequelize|Op' }],
      },
    },

    // Tests: allow dev-only requires like supertest
    {
      files: ['tests/**', 'workspace/tests/**'],
      rules: {
        'node/no-unpublished-require': 'off',
      },
    },

    // If profile.js is front-end code (uses document/localStorage), treat as browser
    {
      files: ['src/routes/profile.js'],
      env: { browser: true },
      rules: {
        'no-console': 'off',
      },
    },

    // Known file that declares functions inside blocks
    {
      files: ['src/routes/payments.js'],
      rules: { 'no-inner-declarations': 'off' },
    },
  ],

  // Also set top-level ignore patterns so eslint doesn't touch workspace/build outputs
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'public/', 'coverage/', 'workspace/'],
};

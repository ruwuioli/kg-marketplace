module.exports = {
  extends: ['../../packages/config/eslint-base.cjs'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.eslint.json'],
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}

module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  settings: { react: { version: "detect" } },
  plugins: ["react", "react-hooks"],
  extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react/jsx-runtime", "plugin:react-hooks/recommended"],
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    "no-empty": ["warn", { allowEmptyCatch: true }],
  },
  overrides: [
    {
      files: ["**/*.test.js"],
      globals: { test: "readonly", expect: "readonly", beforeEach: "readonly", afterEach: "readonly", describe: "readonly", it: "readonly" },
    },
  ],
};

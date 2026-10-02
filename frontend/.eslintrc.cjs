// ESLint: aturan dasar React + penegakan batas arsitektur (docs/guide/01 & frontend/CLAUDE.md).
const fs = require("fs");
const path = require("path");

const FEATURES = fs
  .readdirSync(path.join(__dirname, "src/features"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const restrict = (patterns, message) => ({ group: patterns, message });

module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  settings: { react: { version: "detect" } },
  plugins: ["react", "react-hooks"],
  extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react/jsx-runtime", "plugin:react-hooks/recommended"],
  ignorePatterns: ["dist", "build", "node_modules", "src/shared/ui/**"],
  rules: {
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    "no-empty": ["warn", { allowEmptyCatch: true }],
  },
  overrides: [
    {
      files: ["**/*.test.js"],
      env: { node: true },
      globals: { describe: "readonly", test: "readonly", it: "readonly", expect: "readonly", vi: "readonly", beforeAll: "readonly", afterAll: "readonly", beforeEach: "readonly", afterEach: "readonly" },
    },
    // domain/: murni (tanpa React, store, UI, atau storage)
    {
      files: ["src/domain/**/*.js"],
      excludedFiles: ["**/*.test.js"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [{ name: "react", message: "domain/ harus pure: tanpa React." }],
            patterns: [
              restrict(["@/features/*", "@/features/**", "@/stores/*", "@/app/*", "@/app/**", "@/services/*", "@/services/**"], "domain/ hanya boleh import @/domain/* dan @/shared/lib/*."),
              restrict(["@/shared/ui/*", "@/shared/components/*", "@/shared/hooks/*"], "domain/ tidak boleh bergantung pada UI/hook."),
            ],
          },
        ],
      },
    },
    // shared/lib|ui|hooks, services/, config/: generik, tidak boleh bergantung pada lapisan di atasnya
    {
      files: ["src/shared/**/*.js", "src/services/**/*.js", "src/config/**/*.js"],
      excludedFiles: ["src/shared/components/**/*.js"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [restrict(["@/features/*", "@/features/**", "@/stores/*", "@/app/*", "@/app/**"], "Lapisan shared/services/config tidak boleh import features/stores/app.")] },
        ],
      },
    },
    // shared/components: komponen app-aware, boleh membaca stores tetapi tidak boleh import features/app
    {
      files: ["src/shared/components/**/*.js"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [restrict(["@/features/*", "@/features/**", "@/app/*", "@/app/**"], "shared/components tidak boleh import features/ atau app/.")] },
        ],
      },
    },
    // stores/: boleh domain, shared, services; tidak boleh features/app
    {
      files: ["src/stores/**/*.js"],
      rules: {
        "no-restricted-imports": [
          "error",
          { patterns: [restrict(["@/features/*", "@/features/**", "@/app/*", "@/app/**"], "stores/ tidak boleh import features/ atau app/.")] },
        ],
      },
    },
    // features/<x>/: tidak boleh import internal feature lain (pakai @/features/<y> = index.js) & tidak boleh import app/
    // (test integrasi di __tests__ boleh merangkai app/ & feature lain)
    ...FEATURES.map((name) => ({
      files: [`src/features/${name}/**/*.js`],
      excludedFiles: ["**/__tests__/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              restrict(
                [...FEATURES.filter((other) => other !== name).map((other) => `@/features/${other}/*`)],
                "Import feature lain hanya lewat public API: @/features/<nama> (index.js)."
              ),
              restrict(["@/app/*", "@/app/**"], "features/ tidak boleh import app/."),
              restrict(["@/services/storage/*"], "Akses storage hanya lewat stores/ (kecuali resetDemoData di app/)."),
            ],
          },
        ],
      },
    })),
  ],
};

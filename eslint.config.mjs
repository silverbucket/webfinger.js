import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["test/**", "dist/**", ".tmp/**", "test-runner.js", "scripts/**", "coverage/**"],
  },
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.browser }},
  // Configuration for spec files (tests)
  {
    files: ["spec/**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: "readonly",
        it: "readonly", 
        before: "readonly",
        beforeEach: "readonly",
        after: "readonly",
        afterEach: "readonly",
        expect: "readonly"
      }
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];

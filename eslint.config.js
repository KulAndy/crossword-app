import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

import jsxA11Y from "eslint-plugin-jsx-a11y";
import reactPlugin from "eslint-plugin-react";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import reactDom from "eslint-plugin-react-dom";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactWebApi from "eslint-plugin-react-web-api";
import perfectionist from "eslint-plugin-perfectionist";
import promise from "eslint-plugin-promise";
import sonarjs from "eslint-plugin-sonarjs";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import * as regexpPlugin from "eslint-plugin-regexp";
import pluginLingui from "eslint-plugin-lingui";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import importPlugin from "eslint-plugin-import";

const languageOptions = {
  globals: globals.builtin,
  ecmaVersion: 2023,
  sourceType: "module",

  parserOptions: {
    project: "./tsconfig.app.json",
  },
};

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions,
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
      reactDom.configs.recommended,
      reactNamingConvention.configs.recommended,
      reactWebApi.configs.recommended,
      eslintPluginUnicorn.configs.recommended,
      regexpPlugin.configs["flat/recommended"],
      pluginLingui.configs["flat/recommended"],
      reactRefresh.configs.recommended,
      jsxA11Y.flatConfigs.strict,
      jsxA11Y.flatConfigs.recommended,
      noUnsanitized.configs.recommended,
      prettierRecommended,
      promise.configs["flat/recommended"],
      reactPlugin.configs.flat.recommended,
      reactPlugin.configs.flat["jsx-runtime"],
      reactHooks.configs["recommended-latest"],
      reactHooksExtra.configs.recommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.errors,
      importPlugin.flatConfigs.warnings,
      importPlugin.flatConfigs.typescript,
      perfectionist.configs["recommended-alphabetical"],
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strict,
      sonarjs.configs.recommended,
    ],
    rules: {
      "sonarjs/no-nested-conditional": "off",
      "unicorn/no-null": "off",
      "unicorn/filename-case": "off",
      "promise/always-return": "off",
      "react-hooks-extra/no-direct-set-state-in-use-effect": "off",
      curly: ["error", "all"],
      "func-names": ["error", "always"],
      "no-eval": "error",
      "prefer-template": "error",
      "space-infix-ops": "error",
      "object-curly-spacing": ["error", "always"],

      "arrow-spacing": [
        "error",
        {
          before: true,
          after: true,
        },
      ],

      "multiline-comment-style": ["error", "starred-block"],
      "no-unneeded-ternary": "error",
      eqeqeq: "error",

      "func-style": [
        "error",
        "declaration",
        {
          allowArrowFunctions: true,
        },
      ],

      "no-caller": "error",
      "no-unused-expressions": "error",
      "no-shadow": "error",
      "no-unused-vars": "error",
      "no-redeclare": "error",
      "prefer-spread": "error",
      "prefer-rest-params": "error",
      "comma-dangle": ["error", "always-multiline"],

      "key-spacing": [
        "error",
        {
          beforeColon: false,
          afterColon: true,
        },
      ],

      "line-comment-position": [
        "error",
        {
          position: "above",
        },
      ],

      "no-empty-pattern": "error",
      "no-fallthrough": "error",
      "no-mixed-spaces-and-tabs": "error",
      "no-useless-rename": "error",
      "prefer-const": "error",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "linebreak-style": ["error", "unix"],
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],
      curly: ["error", "all"],
      "no-var": "error",
      "prefer-arrow-callback": "warn",
      "no-duplicate-imports": "error",

      "no-use-before-define": [
        "error",
        {
          functions: false,
          classes: true,
        },
      ],

      "no-empty": "warn",
      "no-extra-semi": "error",
      "no-extra-boolean-cast": "warn",
      "no-dupe-keys": "error",
      "no-implied-eval": "error",
      "no-new-wrappers": "error",
      "for-direction": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": ["error", "always"],
      "no-debugger": "error",
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-irregular-whitespace": "error",
      "no-self-compare": "error",
      "no-sparse-arrays": "error",
      "no-template-curly-in-string": "error",
      "no-unexpected-multiline": "error",
      "no-unmodified-loop-condition": "error",
      complexity: ["warn", 60],
      "max-nested-callbacks": ["error", 10],
      "no-lonely-if": "error",
      "no-negated-condition": "error",
      yoda: ["error", "never"],
      "no-unused-vars": "off",
    },
  },
]);

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const nextDefaultIgnores = [
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(nextDefaultIgnores),
]);

export default eslintConfig;

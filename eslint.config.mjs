import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const nextDefaultIgnores = [".next/**", "out/**", "build/**", "next-env.d.ts"];

const generatedIgnores = ["src/generated/**"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([...nextDefaultIgnores, ...generatedIgnores]),
]);

export default eslintConfig;

import { pathsToModuleNameMapper, createDefaultPreset } from "ts-jest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsconfigPath = path.resolve(__dirname, "tsconfig.json");
const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));

const tsJestTransformCfg = createDefaultPreset().transform;

const base_config = {
  preset: "ts-jest" as const,
  testEnvironment: "node" as const,
  roots: ["<rootDir>/test"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/config/**",
    "!src/database/**",
    "!src/models/**",
    "!test/**",
  ],
  coveragePathIgnorePatterns: [
    "<rootDir>/src/config/",
    "<rootDir>/src/database/",
    "<rootDir>/src/models/",
    "<rootDir>/src/services/loggingService.ts",
    "<rootDir>/test/",
  ],
  transform: { ...tsJestTransformCfg },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleNameMapper: pathsToModuleNameMapper(
    tsconfigJson.compilerOptions?.paths ?? {},
    { prefix: "<rootDir>/" },
  ),
};

const unit = {
  ...base_config,
  displayName: "unit",
  setupFilesAfterEnv: ["<rootDir>/test/unit/setup.ts"],
  testMatch: ["**/unit/**/*.test.ts"],
};

const integration = {
  ...base_config,
  displayName: "integration",
  testMatch: ["**/integration/**/*.integration.test.ts"],
};

const config = {
  projects: [unit, integration],
};

export default config;

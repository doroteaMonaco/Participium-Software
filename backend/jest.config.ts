import type { Config } from "jest";
import { pathsToModuleNameMapper, createDefaultPreset } from "ts-jest";
import tsconfig from "./tsconfig.json";

const tsJestTransformCfg = createDefaultPreset().transform;

const base_config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
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
    tsconfig.compilerOptions.paths ?? {},
    { prefix: "<rootDir>/" },
  ),
};

const unit: Config = {
  ...base_config,
  displayName: "unit",
  setupFilesAfterEnv: ["<rootDir>/test/unit/setup.ts"],
  testMatch: ["**/unit/**/*.test.ts"],
};

const integration: Config = {
  ...base_config,
  displayName: "integration",
  testMatch: ["**/integration/**/*.integration.test.ts"],
};

const config: Config = {
  projects: [unit, integration],
};
export default config;

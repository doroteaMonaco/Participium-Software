import { pathsToModuleNameMapper, createDefaultPreset } from "ts-jest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const tsconfig = require("./tsconfig.json");

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
    tsconfig.compilerOptions?.paths ?? {},
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

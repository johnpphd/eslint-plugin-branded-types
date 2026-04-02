import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-branded-type-cast.js";
import "./setup.js";
import path from "path";

const tsParserImport = await import("@typescript-eslint/parser");

// --- Name-based detection (settings.types) ---
const nameTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      types: ["UserId", "Email"],
    },
  },
});

nameTester.run("no-branded-type-cast (name-based)", rule, {
  valid: [
    `const x = "hello" as string;`,
    // Not in the configured list
    `const x = "hello" as SessionId;`,
  ],
  invalid: [
    {
      code: `const x = "hello" as UserId;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    {
      code: `const x = input as Email;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- Pattern-based detection ---
const patternTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      pattern: "Id$",
    },
  },
});

patternTester.run("no-branded-type-cast (pattern-based)", rule, {
  valid: [
    `const x = "hello" as string;`,
    // "Email" doesn't match "Id$"
    `const x = "hello" as Email;`,
  ],
  invalid: [
    {
      code: `const x = "hello" as UserId;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    {
      code: `const x = "hello" as SessionId;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- Combined types + pattern ---
const combinedTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      types: ["Email", "PhoneNumber"],
      pattern: "Id$",
    },
  },
});

combinedTester.run("no-branded-type-cast (types + pattern combined)", rule, {
  valid: [
    // Matches neither list nor pattern
    `const x = "hello" as Token;`,
  ],
  invalid: [
    // Matches types list
    {
      code: `const x = "hello" as Email;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    // Matches pattern
    {
      code: `const x = "hello" as UserId;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    // Matches types list
    {
      code: `const x = "hello" as PhoneNumber;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- Fallback heuristic (no settings, matches "brand" substring) ---
const fallbackTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
});

fallbackTester.run("no-branded-type-cast (fallback heuristic)", rule, {
  valid: [
    // No "brand" in name, no settings
    `const x = "hello" as UserId;`,
    `const x = "hello" as Email;`,
  ],
  invalid: [
    {
      code: `const x = "hello" as BrandedToken;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- Angle-bracket assertion syntax ---
const angleBracketTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId", "Email"] },
  },
});

angleBracketTester.run("no-branded-type-cast (angle-bracket)", rule, {
  valid: [`const x = <string>"hello";`],
  invalid: [
    {
      code: `const x = <UserId>"hello";`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    {
      code: `const x = <Email>input;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- satisfies keyword ---
const satisfiesTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId"] },
  },
});

satisfiesTester.run("no-branded-type-cast (satisfies)", rule, {
  valid: [`const x = "hello" satisfies string;`],
  invalid: [
    {
      code: `const x = "hello" satisfies UserId;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- Qualified/namespaced type names ---
const qualifiedTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId"] },
  },
});

qualifiedTester.run("no-branded-type-cast (qualified names)", rule, {
  valid: [],
  invalid: [
    {
      code: `const x = "hello" as Ns.UserId;`,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

// --- Structural detection (type-aware, resolves __brand via type checker) ---
const structuralTester = new RuleTester({
  languageOptions: {
    parser: tsParserImport,
    parserOptions: {
      projectService: {
        allowDefaultProject: ["*.ts"],
        defaultProject: path.resolve(import.meta.dirname, "tsconfig.test.json"),
      },
      tsconfigRootDir: import.meta.dirname,
    },
  },
});

structuralTester.run("no-branded-type-cast (structural)", rule, {
  valid: [
    // Plain string has no __brand
    `const x = "hello" as string;`,
    // Plain type alias (no __brand) must NOT be flagged
    {
      code: `
        type UserName = string;
        const x = "hello" as UserName;
      `,
    },
    // Object type without __brand
    {
      code: `
        type Config = { key: string; value: string };
        const x = {} as Config;
      `,
    },
  ],
  invalid: [
    // Inline branded type (no "brand" in name, detected structurally)
    {
      code: `
        type UserId = string & { __brand: "UserId" };
        const x = "hello" as UserId;
      `,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    {
      code: `
        type Email = string & { __brand: "Email" };
        const x = input as Email;
      `,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    // Imported branded type from fixture
    {
      code: `
        import { UserId } from "./fixtures/brands.js";
        const x = "hello" as UserId;
      `,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    {
      code: `
        import { Email } from "./fixtures/brands.js";
        const x = input as Email;
      `,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
    {
      code: `
        import { PhoneNumber } from "./fixtures/brands.js";
        const x = "+1234567890" as PhoneNumber;
      `,
      errors: [{ messageId: "noBrandedTypeCast" }],
    },
  ],
});

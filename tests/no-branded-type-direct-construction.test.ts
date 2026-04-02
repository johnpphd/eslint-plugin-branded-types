import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-branded-type-direct-construction.js";
import "./setup.js";
import path from "path";

const tsParserImport = await import("@typescript-eslint/parser");

// --- Name-based detection ---
const nameTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      types: ["UserId", "Email"],
    },
  },
});

nameTester.run("no-branded-type-direct-construction (name-based)", rule, {
  valid: [
    // Untyped variable
    `const x = "hello";`,
    // Type not in branded list
    `const x: SessionId = "hello";`,
    // Constructed via .parse()
    `const x: UserId = UserIdSchema.parse("abc");`,
  ],
  invalid: [
    {
      code: `const x: UserId = "raw-string";`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `const x: Email = someOtherFunction();`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      // No initializer at all
      code: `let x: UserId;`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      // safeParse returns a wrapper, not the branded type directly
      code: `const x: Email = EmailSchema.safeParse("test@example.com");`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      // JSON.parse is not a schema parse
      code: `const x: UserId = JSON.parse('"abc"');`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
  ],
});

// --- Pattern-based detection ---
const patternTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      pattern: "Id$|^Email$|^PhoneNumber$",
    },
  },
});

patternTester.run("no-branded-type-direct-construction (pattern-based)", rule, {
  valid: [
    `const x: UserId = UserIdSchema.parse("abc");`,
    // "Token" doesn't match pattern
    `const x: Token = "abc";`,
  ],
  invalid: [
    {
      code: `const x: UserId = "raw";`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `const x: Email = "test@test.com";`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `const x: PhoneNumber = "+1234567890";`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
  ],
});

// --- Function parameters with branded type annotations ---
const paramTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId", "Email"] },
  },
});

paramTester.run("no-branded-type-direct-construction (function params)", rule, {
  valid: [
    // Non-branded param is fine
    `function foo(name: string) {}`,
    // Arrow function with non-branded param
    `const fn = (x: number) => x;`,
  ],
  invalid: [
    {
      code: `function foo(id: UserId) {}`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `const fn = (email: Email) => {};`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `const fn = function(id: UserId) {};`,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
  ],
});

// --- Class properties with branded type annotations ---
const classTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId"] },
  },
});

classTester.run(
  "no-branded-type-direct-construction (class properties)",
  rule,
  {
    valid: [
      // Non-branded property
      `class User { name: string = ""; }`,
      // Branded property initialized via parse
      `class User { id: UserId = UserIdSchema.parse("abc"); }`,
    ],
    invalid: [
      {
        code: `class User { id: UserId = "raw"; }`,
        errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
      },
      {
        code: `class User { id: UserId; }`,
        errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
      },
    ],
  }
);

// --- Qualified/namespaced type names ---
const qualifiedTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId"] },
  },
});

qualifiedTester.run(
  "no-branded-type-direct-construction (qualified names)",
  rule,
  {
    valid: [],
    invalid: [
      {
        code: `const x: Ns.UserId = "raw";`,
        errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
      },
    ],
  }
);

// --- Structural detection (type-aware) ---
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

structuralTester.run("no-branded-type-direct-construction (structural)", rule, {
  valid: [
    // Plain type, no __brand
    `const x: string = "hello";`,
    // Plain type alias, no __brand
    {
      code: `
        type UserName = string;
        const x: UserName = "hello";
      `,
    },
    // Branded but via parse() (allowed)
    {
      code: `
        type UserId = string & { __brand: "UserId" };
        declare const UserIdSchema: { parse(v: unknown): UserId };
        const x: UserId = UserIdSchema.parse("abc");
      `,
    },
    // Imported branded type via parse()
    {
      code: `
        import { UserId, UserIdSchema } from "./fixtures/brands.js";
        const x: UserId = UserIdSchema.parse("abc");
      `,
    },
  ],
  invalid: [
    // Inline branded type, direct assignment
    {
      code: `
        type UserId = string & { __brand: "UserId" };
        const x: UserId = "raw-string";
      `,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `
        type Email = string & { __brand: "Email" };
        const x: Email = someFunction();
      `,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    // Imported branded type, direct assignment
    {
      code: `
        import { UserId } from "./fixtures/brands.js";
        const x: UserId = "raw-string";
      `,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    {
      code: `
        import { Email } from "./fixtures/brands.js";
        const x: Email = "test@test.com";
      `,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    // Imported branded type, no initializer
    {
      code: `
        import { PhoneNumber } from "./fixtures/brands.js";
        let x: PhoneNumber;
      `,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
    // safeParse returns wrapper, not branded type
    {
      code: `
        type Email = string & { __brand: "Email" };
        declare const EmailSchema: { safeParse(v: unknown): Email };
        const x: Email = EmailSchema.safeParse("test@test.com");
      `,
      errors: [{ messageId: "noBrandedTypeDirectConstruction" }],
    },
  ],
});

import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/no-branded-value-mutation.js";
import "./setup.js";
import path from "path";

const tsParserImport = await import("@typescript-eslint/parser");

// --- Name-based detection ---
const nameTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      types: ["UserId", "BrandedArray"],
    },
  },
});

nameTester.run("no-branded-value-mutation (name-based)", rule, {
  valid: [
    // Non-branded variable mutation is fine
    `const arr: string[] = []; arr.push("x");`,
    // Type not in branded list
    `const x: Email = "test"; x.toString();`,
    // Reading properties is fine (not a mutating method)
    `const x: UserId = "abc"; console.log(x.length);`,
  ],
  invalid: [
    // All mutating array methods
    {
      code: `const arr: BrandedArray = []; arr.push("x");`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.pop();`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.splice(0, 1);`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.sort();`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.reverse();`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.fill("x");`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.shift();`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.unshift("x");`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    {
      code: `const arr: BrandedArray = []; arr.copyWithin(0, 1);`,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    // Index assignment
    {
      code: `const obj: UserId = "abc"; obj[0] = "x";`,
      errors: [{ messageId: "noBrandedMutation" }],
    },
    // Object.assign
    {
      code: `const obj: UserId = "abc"; Object.assign(obj, { x: 1 });`,
      errors: [{ messageId: "noBrandedMutation" }],
    },
    // delete
    {
      code: `const obj: UserId = "abc"; delete obj.prop;`,
      errors: [{ messageId: "noBrandedMutation" }],
    },
  ],
});

// --- Scope-aware tracking (no false positives across scopes) ---
const scopeTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId"] },
  },
});

scopeTester.run("no-branded-value-mutation (scope-aware)", rule, {
  valid: [
    // Same variable name in different scope should NOT be flagged
    {
      code: `
        function a() { const x: UserId = "abc" as any; }
        function b() { const x: string[] = []; x.push("y"); }
      `,
    },
    // Shadowed variable in inner scope is not branded
    {
      code: `
        function outer() {
          const x: UserId = "abc" as any;
          function inner() {
            const x: string[] = [];
            x.push("y");
          }
        }
      `,
    },
  ],
  invalid: [
    // Same scope should still be flagged
    {
      code: `const x: UserId = "abc" as any; x[0] = "y";`,
      errors: [{ messageId: "noBrandedMutation" }],
    },
  ],
});

// --- Inferred branded types (via .parse() heuristic) ---
const inferredTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": { types: ["UserId"] },
  },
});

inferredTester.run("no-branded-value-mutation (inferred via parse)", rule, {
  valid: [
    // JSON.parse is not a schema parse, so variable is not tracked
    `const x = JSON.parse("{}"); x.push("y");`,
  ],
  invalid: [
    // Variable inferred as branded via Schema.parse() heuristic
    {
      code: `const x = UserIdSchema.parse("abc"); x[0] = "y";`,
      errors: [{ messageId: "noBrandedMutation" }],
    },
  ],
});

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

structuralTester.run("no-branded-value-mutation (structural)", rule, {
  valid: [
    // Plain type, no __brand, mutation is fine
    {
      code: `
        type UserName = string;
        const x: UserName = "abc";
        console.log(x.length);
      `,
    },
    // Plain array, mutation is fine
    `const arr: string[] = []; arr.push("x");`,
  ],
  invalid: [
    // Inline branded type
    {
      code: `
        type BrandedList = string[] & { __brand: "BrandedList" };
        const arr: BrandedList = [] as BrandedList;
        arr.push("x");
      `,
      errors: [{ messageId: "noBrandedMethodMutation" }],
    },
    // Imported branded type
    {
      code: `
        import { UserId } from "./fixtures/brands.js";
        const x: UserId = "" as UserId;
        x[0] = "y";
      `,
      errors: [{ messageId: "noBrandedMutation" }],
    },
    // Object.assign on imported branded type
    {
      code: `
        import { Email } from "./fixtures/brands.js";
        const x: Email = "" as Email;
        Object.assign(x, { extra: true });
      `,
      errors: [{ messageId: "noBrandedMutation" }],
    },
    // delete on imported branded type
    {
      code: `
        import { PhoneNumber } from "./fixtures/brands.js";
        const x: PhoneNumber = "" as PhoneNumber;
        delete x.prop;
      `,
      errors: [{ messageId: "noBrandedMutation" }],
    },
  ],
});

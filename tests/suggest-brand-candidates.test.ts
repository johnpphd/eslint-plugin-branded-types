import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../src/rules/suggest-brand-candidates.js";
import "./setup.js";

const tsParserImport = await import("@typescript-eslint/parser");

// --- Name-based detection: known brands are skipped (no-branded-type-cast handles them) ---
const nameTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
  settings: {
    "branded-types": {
      types: ["BrandedId", "UserId"],
    },
  },
});

nameTester.run("suggest-brand-candidates", rule, {
  valid: [
    // Single cast, not a double-cast
    `const x = input as SomeType;`,
    // `as unknown` alone (no outer cast)
    `const x = input as unknown;`,
    // Double-cast to a KNOWN branded type: skipped (no-branded-type-cast handles it)
    `const x = input as unknown as BrandedId;`,
    `const x = input as unknown as UserId;`,
    // Regular single cast to a non-brand
    `const x = input as AbstractAgent;`,
    // Chained `as` that is not `as unknown as X`
    `const x = input as string as number;`,
  ],
  invalid: [
    {
      code: `const x = input as unknown as AbstractAgent;`,
      errors: [
        {
          messageId: "doubleCastCandidate",
          data: { typeName: "AbstractAgent" },
        },
      ],
    },
    {
      code: `const x = input as unknown as SomeRandomType;`,
      errors: [
        {
          messageId: "doubleCastCandidate",
          data: { typeName: "SomeRandomType" },
        },
      ],
    },
    {
      code: `const x = input as unknown as Ns.Inner;`,
      errors: [
        { messageId: "doubleCastCandidate", data: { typeName: "Inner" } },
      ],
    },
    {
      code: `const x = input as unknown as { foo: string };`,
      errors: [{ messageId: "doubleCastStructural" }],
    },
    {
      code: `const x = input as unknown as string[];`,
      errors: [{ messageId: "doubleCastStructural" }],
    },
  ],
});

// --- Fallback heuristic: "brand" substring should also be skipped ---
const fallbackTester = new RuleTester({
  languageOptions: { parser: tsParserImport },
});

fallbackTester.run("suggest-brand-candidates (fallback heuristic)", rule, {
  valid: [
    // Contains "brand" -> recognized as brand, skipped
    `const x = input as unknown as BrandedToken;`,
  ],
  invalid: [
    {
      code: `const x = input as unknown as PlainType;`,
      errors: [
        { messageId: "doubleCastCandidate", data: { typeName: "PlainType" } },
      ],
    },
  ],
});

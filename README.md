# eslint-plugin-branded-types

ESLint rules enforcing branded type safety. Bans casts, direct construction, and mutation of Zod branded types.

## Install

```bash
npm install -D eslint-plugin-branded-types
```

## Setup

ESLint flat config (`eslint.config.js`):

```js
import brandedTypes from "eslint-plugin-branded-types";

export default [
  brandedTypes.configs.recommended,
  // ... your other config
];
```

## Rules

### `branded-types/no-branded-type-cast`

Disallows type assertions targeting branded types. Catches `as Type`, `<Type>value` (angle-bracket), and `satisfies Type` syntax. Also detects qualified names like `Ns.BrandedType`.

```ts
// Bad
const email = rawInput as BrandedEmail;
const email = <BrandedEmail>rawInput;
const email = rawInput satisfies BrandedEmail;

// Good
const email = EmailSchema.parse(rawInput);
```

### `branded-types/no-branded-type-direct-construction`

Disallows directly annotating a variable, function parameter, or class property with a branded type without calling `.parse()`. The `safeParse()` return value is a wrapper object (`{ success, data, error }`), not the branded type itself, so it is not allowed as a direct assignment.

```ts
// Bad
const email: BrandedEmail = rawInput;
function process(email: BrandedEmail) {}
class User {
  email: BrandedEmail = rawInput;
}
const x: BrandedEmail = JSON.parse(data);

// Good
const email = EmailSchema.parse(rawInput);
const result = EmailSchema.safeParse(rawInput);
if (result.success) {
  use(result.data);
}
```

### `branded-types/no-branded-value-mutation`

Disallows mutation of branded values: index assignment, mutating method calls (`.push()`, `.splice()`, etc.), `Object.assign()`, and `delete`. Detects branded variables through both explicit type annotations and inferred types from `.parse()` calls.

```ts
// Bad
brandedList.push(item);
brandedList[0] = newItem;
Object.assign(brandedObj, { key: "value" });
delete brandedObj.key;

// Good
const newList = ListSchema.parse([...brandedList, item]);
```

## How it works

Branded type detection uses a multi-strategy resolution order:

1. **Structural detection** (requires type-aware linting): Resolves the TypeScript type and checks for a `__brand` property. Works with any naming convention, zero configuration needed. Also detects branded types inside unions (e.g., `UserId | null`) and intersections.

2. **Explicit type list** (`settings["branded-types"].types`): An array of type names to treat as branded. Exact match.

3. **Regex pattern** (`settings["branded-types"].pattern`): A regular expression tested against type names.

4. **Fallback heuristic**: If no settings are configured and type-aware linting is unavailable, types whose name contains "brand" (case-insensitive) are treated as branded.

### Configuration

Configure detection in your ESLint settings:

```js
export default [
  brandedTypes.configs.recommended,
  {
    settings: {
      "branded-types": {
        // Explicit list of branded type names
        types: ["UserId", "Email", "PhoneNumber"],
        // Regex pattern for branded type names
        pattern: "Id$|^Email$",
      },
    },
  },
];
```

For best results, enable type-aware linting with `@typescript-eslint/parser` and a `tsconfig.json` project. This enables structural detection (strategy 1), which requires no configuration and catches all branded types regardless of naming.

## Config presets

- **`recommended`**: All three rules enabled as `error`. Test files (`*.test.*`, `*.spec.*`) are ignored.
- **`all`**: All three rules enabled as `error`. No file exclusions (rules apply everywhere, including tests).

## Background

TypeScript's structural type system allows bypassing branded type boundaries through `as` casts, direct annotation, and mutation. Zod's `.brand()` adds a phantom property at the type level, but the runtime boundary is only enforced if you go through `.parse()`.

Inspired by dependent types in languages like Lean 4, these three rules close the escape hatches: casting (forging a brand), direct construction (skipping validation), and mutation (invalidating a validated value). Together they ensure branded values are always constructed through their schema and treated as immutable thereafter.

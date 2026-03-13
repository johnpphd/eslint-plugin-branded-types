# eslint-plugin-branded-types

ESLint rules enforcing branded type safety -- ban casts, direct construction, and mutation of Zod branded types.

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

Disallows `as` type assertions targeting branded types. Use `Schema.parse()` or `Schema.safeParse()` instead.

```ts
// Bad
const email = rawInput as BrandedEmail;

// Good
const email = EmailSchema.parse(rawInput);
```

### `branded-types/no-branded-type-direct-construction`

Disallows directly annotating a variable with a branded type without calling `.parse()` or `.safeParse()`.

```ts
// Bad
const email: BrandedEmail = rawInput;

// Good
const email = EmailSchema.parse(rawInput);
const result = EmailSchema.safeParse(rawInput);
```

### `branded-types/no-branded-value-mutation`

Disallows mutation of branded values -- index assignment, mutating method calls (`.push()`, `.splice()`, etc.), `Object.assign()`, and `delete`.

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

Detection is based on naming conventions: a type is considered "branded" if its name contains the substring "brand" (case-insensitive). This means types like `BrandedEmail`, `UserIdBrand`, or `EmailBranded` are all detected.

No type-checker integration is required -- the plugin uses only AST analysis, making it fast and compatible with any ESLint setup.

## Test file exemption

All rules are automatically disabled in test files matching `*.test.ts`, `*.spec.ts`, `*.test.tsx`, `*.spec.tsx` (and their `.js`/`.jsx` equivalents). Tests often need to construct branded values directly for fixture setup.

## Background

TypeScript's structural type system allows bypassing branded type boundaries through `as` casts, direct annotation, and mutation. Zod's `.brand()` adds a phantom property at the type level, but the runtime boundary is only enforced if you go through `.parse()` or `.safeParse()`.

Inspired by dependent types in languages like Lean 4, these three rules close the escape hatches: casting (forging a brand), direct construction (skipping validation), and mutation (invalidating a validated value). Together they ensure branded values are always constructed through their schema and treated as immutable thereafter.

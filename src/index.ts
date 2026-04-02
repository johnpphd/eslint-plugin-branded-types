import type { ESLint, Linter } from "eslint";
import noBrandedTypeCast from "./rules/no-branded-type-cast.js";
import noBrandedTypeDirectConstruction from "./rules/no-branded-type-direct-construction.js";
import noBrandedValueMutation from "./rules/no-branded-value-mutation.js";

const rules = {
  "no-branded-type-cast": noBrandedTypeCast,
  "no-branded-type-direct-construction": noBrandedTypeDirectConstruction,
  "no-branded-value-mutation": noBrandedValueMutation,
};

const allRules: Linter.RulesRecord = {
  "branded-types/no-branded-type-cast": "error",
  "branded-types/no-branded-type-direct-construction": "error",
  "branded-types/no-branded-value-mutation": "error",
};

const plugin: ESLint.Plugin & {
  configs: Record<string, Linter.Config>;
} = {
  // Cast needed: @typescript-eslint RuleModule is structurally compatible
  // with ESLint's Plugin.rules but the types don't align exactly.
  rules: rules as unknown as ESLint.Plugin["rules"],
  configs: {
    recommended: {
      plugins: {
        get "branded-types"() {
          return plugin;
        },
      },
      rules: allRules,
      ignores: ["**/*.test.*", "**/*.spec.*"],
    },
    all: {
      plugins: {
        get "branded-types"() {
          return plugin;
        },
      },
      rules: allRules,
    },
  },
};

export { rules };
export default plugin;

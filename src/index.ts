import type { ESLint, Linter } from "eslint";
import noBrandedTypeCast from "./rules/no-branded-type-cast.js";
import noBrandedTypeDirectConstruction from "./rules/no-branded-type-direct-construction.js";
import noBrandedValueMutation from "./rules/no-branded-value-mutation.js";

const rules = {
  "no-branded-type-cast": noBrandedTypeCast,
  "no-branded-type-direct-construction": noBrandedTypeDirectConstruction,
  "no-branded-value-mutation": noBrandedValueMutation,
};

const recommendedRules: Linter.RulesRecord = {
  "branded-types/no-branded-type-cast": "error",
  "branded-types/no-branded-type-direct-construction": "error",
  "branded-types/no-branded-value-mutation": "error",
};

const plugin: ESLint.Plugin & {
  configs: Record<string, Linter.Config>;
} = {
  rules,
  configs: {
    recommended: {
      plugins: {
        get "branded-types"() {
          return plugin;
        },
      },
      rules: recommendedRules,
    },
    all: {
      plugins: {
        get "branded-types"() {
          return plugin;
        },
      },
      rules: recommendedRules,
    },
  },
};

export { rules };
export default plugin;

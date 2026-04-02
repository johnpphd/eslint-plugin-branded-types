import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { createIsBrandedType, extractTypeName } from "../utils.js";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

export default createRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow type assertions targeting branded types. Use Schema.parse() instead.",
    },
    messages: {
      noBrandedTypeCast:
        "Avoid `as {{ typeName }}`. Branded types must be constructed via `Schema.parse()`, not type assertions.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const checker = createIsBrandedType(context);

    function checkAssertion(
      node:
        | TSESTree.TSAsExpression
        | TSESTree.TSTypeAssertion
        | TSESTree.TSSatisfiesExpression
    ) {
      const typeName = extractTypeName(node.typeAnnotation);
      if (!typeName) {
        // Not a type reference or unrecognized shape; try structural only
        if (checker.byNode(node.typeAnnotation)) {
          context.report({
            node,
            messageId: "noBrandedTypeCast",
            data: { typeName: "branded type" },
          });
        }
        return;
      }

      if (checker.byNode(node.typeAnnotation) || checker.byName(typeName)) {
        context.report({
          node,
          messageId: "noBrandedTypeCast",
          data: { typeName },
        });
      }
    }

    return {
      TSAsExpression: checkAssertion,
      TSTypeAssertion: checkAssertion,
      TSSatisfiesExpression: checkAssertion,
    };
  },
});

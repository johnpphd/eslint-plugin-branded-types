import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import { createIsBrandedType, extractTypeName } from "../utils.js";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

export default createRule({
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Flag `as unknown as X` double-casts whose target is not a known branded type. Such casts bypass every type guarantee; the target is likely a branding candidate.",
    },
    messages: {
      doubleCastCandidate:
        "`as unknown as {{ typeName }}` bypasses all type checking. If `{{ typeName }}` represents a validated invariant, brand it (e.g. via `z.brand()`) and construct via `Schema.parse()` instead.",
      doubleCastStructural:
        "`as unknown as <structural type>` bypasses all type checking. Replace the double-cast with a parsed/validated value, or introduce a branded type.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const checker = createIsBrandedType(context);

    return {
      TSAsExpression(node: TSESTree.TSAsExpression) {
        // Only the outer half of `x as unknown as X`
        if (
          node.expression.type !== "TSAsExpression" ||
          node.expression.typeAnnotation.type !== "TSUnknownKeyword"
        ) {
          return;
        }

        const typeName = extractTypeName(node.typeAnnotation);

        // If the target IS already branded, no-branded-type-cast handles it.
        if (typeName && checker.byName(typeName)) return;
        if (checker.byNode(node.typeAnnotation)) return;

        if (typeName) {
          context.report({
            node,
            messageId: "doubleCastCandidate",
            data: { typeName },
          });
        } else {
          context.report({
            node,
            messageId: "doubleCastStructural",
          });
        }
      },
    };
  },
});

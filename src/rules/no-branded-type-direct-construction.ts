import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import {
  createIsBrandedType,
  extractTypeName,
  isSchemaParseCall,
} from "../utils.js";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

export default createRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct construction of branded types without `.parse()`",
    },
    messages: {
      noBrandedTypeDirectConstruction:
        "Do not directly annotate `{{ varName }}` as `{{ typeName }}`. Let the type be inferred from `Schema.parse()` instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const checker = createIsBrandedType(context);

    function isBranded(typeNode: TSESTree.TypeNode): string | null {
      const name = extractTypeName(typeNode);
      if (!name) return null;
      if (checker.byNode(typeNode) || checker.byName(name)) return name;
      return null;
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || !node.id.typeAnnotation) return;

        const typeNode = node.id.typeAnnotation.typeAnnotation;
        const typeName = isBranded(typeNode);
        if (!typeName) return;

        // Allow Schema.parse() calls (but not JSON.parse, etc.)
        if (isSchemaParseCall(node.init)) return;

        context.report({
          node,
          messageId: "noBrandedTypeDirectConstruction",
          data: {
            varName: node.id.name,
            typeName,
          },
        });
      },

      // Function parameters with branded type annotations
      "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(
        node:
          | TSESTree.FunctionDeclaration
          | TSESTree.FunctionExpression
          | TSESTree.ArrowFunctionExpression
      ) {
        for (const param of node.params) {
          // Handle plain identifier params and assignment pattern defaults
          let ident: TSESTree.Identifier | null = null;
          let defaultValue: TSESTree.Expression | null = null;

          if (param.type === "Identifier") {
            ident = param;
          } else if (
            param.type === "AssignmentPattern" &&
            param.left.type === "Identifier"
          ) {
            ident = param.left;
            defaultValue = param.right;
          }

          if (!ident || !ident.typeAnnotation) continue;
          const typeNode = ident.typeAnnotation.typeAnnotation;
          const typeName = isBranded(typeNode);
          if (!typeName) continue;

          // Allow if default value is a Schema.parse() call
          if (isSchemaParseCall(defaultValue)) continue;

          context.report({
            node: param,
            messageId: "noBrandedTypeDirectConstruction",
            data: {
              varName: ident.name,
              typeName,
            },
          });
        }
      },

      // Class properties with branded type annotations
      PropertyDefinition(node) {
        if (!node.typeAnnotation || node.key.type !== "Identifier") {
          return;
        }

        const typeNode = node.typeAnnotation.typeAnnotation;
        const typeName = isBranded(typeNode);
        if (!typeName) return;

        // Allow if initialized with Schema.parse()
        if (isSchemaParseCall(node.value)) return;

        context.report({
          node,
          messageId: "noBrandedTypeDirectConstruction",
          data: {
            varName: node.key.name,
            typeName,
          },
        });
      },
    };
  },
});

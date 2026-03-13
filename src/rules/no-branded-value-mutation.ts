import type { Rule } from "eslint";

const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "splice",
  "sort",
  "reverse",
  "fill",
  "shift",
  "unshift",
  "copyWithin",
]);

function isBrandedTypeName(name: string): boolean {
  return name.toLowerCase().includes("brand");
}

function isTestFile(filename: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow mutation of branded values",
    },
    messages: {
      noBrandedMutation:
        "Do not mutate branded variable `{{ name }}`. Branded values should be treated as immutable.",
      noBrandedMethodMutation:
        "Do not call `.{{ method }}()` on branded variable `{{ name }}`. Branded values should be treated as immutable.",
    },
    schema: [],
  },
  create(context) {
    if (isTestFile(context.filename)) {
      return {};
    }

    const brandedNames = new Set<string>();

    return {
      VariableDeclarator(
        node: Rule.Node & {
          id?: {
            type: string;
            name?: string;
            typeAnnotation?: {
              typeAnnotation?: {
                type: string;
                typeName?: { type: string; name: string };
              };
            };
          };
        }
      ) {
        const id = node.id;
        if (!id || id.type !== "Identifier" || !id.name) return;

        const tsType = id.typeAnnotation?.typeAnnotation;
        if (
          tsType &&
          tsType.type === "TSTypeReference" &&
          tsType.typeName &&
          tsType.typeName.type === "Identifier" &&
          isBrandedTypeName(tsType.typeName.name)
        ) {
          brandedNames.add(id.name);
        }
      },

      CallExpression(
        node: Rule.Node & {
          callee?: {
            type: string;
            object?: { type: string; name?: string };
            property?: { type: string; name?: string };
          };
          arguments?: Array<{ type: string; name?: string }>;
        }
      ) {
        const callee = node.callee;
        if (!callee) return;

        // Detect mutating method calls: brandedVar.push(), etc.
        if (
          callee.type === "MemberExpression" &&
          callee.object &&
          callee.object.type === "Identifier" &&
          callee.object.name &&
          brandedNames.has(callee.object.name) &&
          callee.property &&
          callee.property.type === "Identifier" &&
          callee.property.name &&
          MUTATING_METHODS.has(callee.property.name)
        ) {
          context.report({
            node,
            messageId: "noBrandedMethodMutation",
            data: {
              name: callee.object.name,
              method: callee.property.name,
            },
          });
          return;
        }

        // Detect Object.assign(brandedVar, ...)
        if (
          callee.type === "MemberExpression" &&
          callee.object &&
          callee.object.type === "Identifier" &&
          callee.object.name === "Object" &&
          callee.property &&
          callee.property.type === "Identifier" &&
          callee.property.name === "assign" &&
          node.arguments &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "Identifier" &&
          node.arguments[0].name &&
          brandedNames.has(node.arguments[0].name)
        ) {
          context.report({
            node,
            messageId: "noBrandedMutation",
            data: {
              name: node.arguments[0].name,
            },
          });
        }
      },

      AssignmentExpression(
        node: Rule.Node & {
          left?: {
            type: string;
            object?: { type: string; name?: string };
          };
        }
      ) {
        // Detect index assignment: brandedVar[i] = x
        if (
          node.left &&
          node.left.type === "MemberExpression" &&
          node.left.object &&
          node.left.object.type === "Identifier" &&
          node.left.object.name &&
          brandedNames.has(node.left.object.name)
        ) {
          context.report({
            node,
            messageId: "noBrandedMutation",
            data: {
              name: node.left.object.name,
            },
          });
        }
      },

      UnaryExpression(
        node: Rule.Node & {
          operator?: string;
          argument?: {
            type: string;
            object?: { type: string; name?: string };
          };
        }
      ) {
        // Detect delete brandedVar[key]
        if (
          node.operator === "delete" &&
          node.argument &&
          node.argument.type === "MemberExpression" &&
          node.argument.object &&
          node.argument.object.type === "Identifier" &&
          node.argument.object.name &&
          brandedNames.has(node.argument.object.name)
        ) {
          context.report({
            node,
            messageId: "noBrandedMutation",
            data: {
              name: node.argument.object.name,
            },
          });
        }
      },
    };
  },
};

export default rule;

import type { Rule } from "eslint";

function isBrandedTypeName(name: string): boolean {
  return name.toLowerCase().includes("brand");
}

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct construction of branded types without `.parse()` or `.safeParse()`",
    },
    messages: {
      noBrandedTypeDirectConstruction:
        "Do not directly annotate `{{ varName }}` as `{{ typeName }}`. Let the type be inferred from `Schema.parse()` or `Schema.safeParse()` instead.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename;
    if (TEST_FILE_PATTERN.test(filename)) {
      return {};
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      VariableDeclarator(node: Rule.Node) {
        const decl = node as unknown as Record<string, unknown>;
        const id = decl.id as
          | {
              type: string;
              name?: string;
              typeAnnotation?: {
                typeAnnotation?: {
                  type: string;
                  typeName?: { type: string; name: string };
                };
              };
            }
          | undefined;

        if (!id || id.type !== "Identifier" || !id.typeAnnotation) {
          return;
        }

        const typeRef = id.typeAnnotation.typeAnnotation;
        if (
          !typeRef ||
          typeRef.type !== "TSTypeReference" ||
          !typeRef.typeName ||
          typeRef.typeName.type !== "Identifier" ||
          !isBrandedTypeName(typeRef.typeName.name)
        ) {
          return;
        }

        const init = decl.init as
          | {
              type: string;
              callee?: {
                type: string;
                property?: { type: string; name: string };
              };
            }
          | null
          | undefined;

        if (
          init &&
          init.type === "CallExpression" &&
          init.callee &&
          init.callee.type === "MemberExpression" &&
          init.callee.property &&
          init.callee.property.type === "Identifier" &&
          (init.callee.property.name === "parse" ||
            init.callee.property.name === "safeParse")
        ) {
          return;
        }

        context.report({
          node,
          messageId: "noBrandedTypeDirectConstruction",
          data: {
            varName: id.name ?? "unknown",
            typeName: typeRef.typeName.name,
          },
        });
      },
    };
  },
};

export default rule;

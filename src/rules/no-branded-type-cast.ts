import type { Rule } from "eslint";

function isBrandedTypeName(name: string): boolean {
  return name.toLowerCase().includes("brand");
}

const TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow `as` type assertions targeting branded types -- use Schema.parse() or Schema.safeParse() instead",
    },
    messages: {
      noBrandedTypeCast:
        "Avoid `as {{ typeName }}` -- branded types must be constructed via `Schema.parse()` or `Schema.safeParse()`, not type assertions.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (TEST_FILE_PATTERN.test(filename)) {
      return {};
    }

    return {
      TSAsExpression(
        node: Rule.Node & {
          typeAnnotation?: {
            type: string;
            typeName?: { type: string; name: string };
          };
        }
      ) {
        const typeAnnotation = node.typeAnnotation;
        if (
          typeAnnotation &&
          typeAnnotation.type === "TSTypeReference" &&
          typeAnnotation.typeName &&
          typeAnnotation.typeName.type === "Identifier" &&
          isBrandedTypeName(typeAnnotation.typeName.name)
        ) {
          context.report({
            node,
            messageId: "noBrandedTypeCast",
            data: {
              typeName: typeAnnotation.typeName.name,
            },
          });
        }
      },
    };
  },
};

export default rule;

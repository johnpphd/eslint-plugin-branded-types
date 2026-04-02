import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import {
  createIsBrandedType,
  extractTypeName,
  isSchemaParseCall,
} from "../utils.js";

const createRule = ESLintUtils.RuleCreator.withoutDocs;

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

export default createRule({
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
  defaultOptions: [],
  create(context) {
    const checker = createIsBrandedType(context);

    /**
     * Track branded variable definitions by their scope-bound identity.
     * Key: TSESTree.Identifier definition node. Using a WeakSet on the
     * definition identifiers ensures scope correctness without manual
     * scope stack management.
     */
    const brandedDefs = new WeakSet<TSESTree.Node>();

    /**
     * Also track variable names that were initialized via Schema.parse()
     * as a heuristic for when type checker is unavailable and no explicit
     * type annotation exists (inferred branded types).
     */
    const parseInitDefs = new WeakSet<TSESTree.Node>();

    function markIfBranded(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== "Identifier") return;

      // Check explicit type annotation
      if (node.id.typeAnnotation) {
        const typeNode = node.id.typeAnnotation.typeAnnotation;
        const name = extractTypeName(typeNode);
        if (name && (checker.byNode(typeNode) || checker.byName(name))) {
          brandedDefs.add(node.id);
          return;
        }
      }

      // Heuristic: track variables initialized via Schema.parse()
      // for inferred branded types
      if (isSchemaParseCall(node.init)) {
        parseInitDefs.add(node.id);
      }
    }

    /**
     * Resolve an identifier to its definition node using ESLint's scope
     * analysis, then check if that definition is branded.
     */
    function isIdentifierBranded(identifier: TSESTree.Identifier): boolean {
      // Fast path: check via type checker (works for inferred types too)
      if (checker.byNode(identifier)) return true;

      // Scope-based lookup: find the variable's definition
      const scope = context.sourceCode.getScope(identifier);
      const ref = scope.references.find((r) => r.identifier === identifier);
      if (!ref?.resolved) return false;

      for (const def of ref.resolved.defs) {
        if (def.node.type === "VariableDeclarator" && def.name) {
          if (brandedDefs.has(def.name)) return true;
          if (parseInitDefs.has(def.name)) return true;
        }
      }
      return false;
    }

    return {
      VariableDeclarator: markIfBranded,

      CallExpression(node) {
        const callee = node.callee;

        // Detect mutating method calls: brandedVar.push(), etc.
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.property.type === "Identifier" &&
          MUTATING_METHODS.has(callee.property.name) &&
          isIdentifierBranded(callee.object)
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
          callee.object.type === "Identifier" &&
          callee.object.name === "Object" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "assign" &&
          node.arguments.length > 0 &&
          node.arguments[0].type === "Identifier" &&
          isIdentifierBranded(node.arguments[0])
        ) {
          context.report({
            node,
            messageId: "noBrandedMutation",
            data: { name: node.arguments[0].name },
          });
        }
      },

      AssignmentExpression(node) {
        // Detect index/property assignment: brandedVar[i] = x, brandedVar.prop = x
        if (
          node.left.type === "MemberExpression" &&
          node.left.object.type === "Identifier" &&
          isIdentifierBranded(node.left.object)
        ) {
          context.report({
            node,
            messageId: "noBrandedMutation",
            data: { name: node.left.object.name },
          });
        }
      },

      UnaryExpression(node) {
        // Detect delete brandedVar[key]
        if (
          node.operator === "delete" &&
          node.argument.type === "MemberExpression" &&
          node.argument.object.type === "Identifier" &&
          isIdentifierBranded(node.argument.object)
        ) {
          context.report({
            node,
            messageId: "noBrandedMutation",
            data: { name: node.argument.object.name },
          });
        }
      },
    };
  },
});

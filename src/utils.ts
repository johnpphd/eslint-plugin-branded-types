import type { TSESTree, TSESLint } from "@typescript-eslint/utils";
import type ts from "typescript";

export interface BrandedTypesSettings {
  /**
   * Explicit list of type names to treat as branded.
   * e.g. ["UserId", "SessionId", "PhoneNumber", "Email"]
   */
  types?: string[];
  /**
   * Regex pattern to match branded type names.
   * e.g. "Id$" matches any type ending in "Id".
   */
  pattern?: string;
}

function getSettings(
  context: TSESLint.RuleContext<string, readonly unknown[]>
): BrandedTypesSettings {
  const raw = (context.settings?.["branded-types"] ?? {}) as Record<
    string,
    unknown
  >;
  return {
    types: Array.isArray(raw.types) ? (raw.types as string[]) : undefined,
    pattern: typeof raw.pattern === "string" ? raw.pattern : undefined,
  };
}

interface TypeServices {
  program: ts.Program;
  esTreeNodeToTSNodeMap: ReadonlyMap<TSESTree.Node, ts.Node>;
}

function getTypeServices(
  context: TSESLint.RuleContext<string, readonly unknown[]>
): TypeServices | null {
  const services = context.sourceCode?.parserServices as
    | (TypeServices & Record<string, unknown>)
    | undefined;
  if (services?.program && services?.esTreeNodeToTSNodeMap) {
    return services;
  }
  return null;
}

/**
 * Check if a TypeScript type (or any member of an intersection/union) has a
 * `__brand` property, which is how Zod's `.brand()` marks branded types.
 */
function typeHasBrand(type: ts.Type): boolean {
  if (type.getProperty("__brand") != null) return true;
  if (type.isIntersection() && type.types) {
    return type.types.some((t) => t.getProperty("__brand") != null);
  }
  if (type.isUnion() && type.types) {
    return type.types.some((t) => typeHasBrand(t));
  }
  return false;
}

/**
 * Extract the type name from a TSTypeReference's typeName.
 * Handles both simple Identifiers ("UserId") and qualified names ("Ns.UserId").
 * Returns the rightmost identifier name, or null if not a type reference.
 */
export function extractTypeName(typeNode: TSESTree.TypeNode): string | null {
  if (typeNode.type !== "TSTypeReference") return null;
  const typeName = typeNode.typeName;
  if (typeName.type === "Identifier") return typeName.name;
  if (typeName.type === "TSQualifiedName") return typeName.right.name;
  return null;
}

/**
 * Returns a function that checks whether a given type name is branded.
 *
 * Resolution order:
 * 1. Structural: if type-aware linting is enabled, resolve the TS type and
 *    check for a `__brand` property (zero config, works with any naming).
 * 2. If `settings["branded-types"].types` is provided, check membership.
 * 3. If `settings["branded-types"].pattern` is provided, test the regex.
 * 4. If none of the above are configured, fall back to the "brand" substring
 *    heuristic.
 */
export function createIsBrandedType(
  context: TSESLint.RuleContext<string, readonly unknown[]>
): {
  byName: (name: string) => boolean;
  byNode: (node: TSESTree.Node) => boolean;
} {
  const settings = getSettings(context);
  const hasExplicitConfig = settings.types != null || settings.pattern != null;
  const typeSet = settings.types ? new Set(settings.types) : null;

  let regex: RegExp | null = null;
  if (settings.pattern) {
    try {
      regex = new RegExp(settings.pattern);
    } catch {
      // Invalid regex in settings; treat as no pattern configured
    }
  }

  const services = getTypeServices(context);
  let warnedByNode = false;

  const byName = (name: string): boolean => {
    if (typeSet && typeSet.has(name)) return true;
    if (regex && regex.test(name)) return true;
    if (!hasExplicitConfig && !services)
      return name.toLowerCase().includes("brand");
    return false;
  };

  const byNode = (node: TSESTree.Node): boolean => {
    if (!services) return false;
    try {
      const checker = services.program.getTypeChecker();
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (!tsNode) return false;
      const type = checker.getTypeAtLocation(tsNode);
      return typeHasBrand(type);
    } catch (e) {
      if (!warnedByNode) {
        warnedByNode = true;
        console.warn(
          "[eslint-plugin-branded-types] Type checker error during structural detection:",
          e instanceof Error ? e.message : e
        );
      }
      return false;
    }
  };

  return { byName, byNode };
}

/**
 * Check if a call expression's callee is `SomeSchema.parse(...)` but NOT
 * `JSON.parse(...)` or other known non-schema parse calls.
 */
export function isSchemaParseCall(
  init: TSESTree.Expression | null | undefined
): boolean {
  if (
    !init ||
    init.type !== "CallExpression" ||
    init.callee.type !== "MemberExpression" ||
    init.callee.property.type !== "Identifier" ||
    init.callee.property.name !== "parse"
  ) {
    return false;
  }
  // Reject known non-schema callers
  if (
    init.callee.object.type === "Identifier" &&
    NON_SCHEMA_PARSE_OBJECTS.has(init.callee.object.name)
  ) {
    return false;
  }
  return true;
}

const NON_SCHEMA_PARSE_OBJECTS = new Set([
  "JSON",
  "Number",
  "Date",
  "URL",
  "BigInt",
]);

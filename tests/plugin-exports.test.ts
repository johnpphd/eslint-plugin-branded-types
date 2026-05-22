import { describe, it, expect } from "vitest";
import plugin, { rules } from "../src/index.js";

describe("plugin exports", () => {
  it("exports all rules", () => {
    expect(rules).toHaveProperty("no-branded-type-cast");
    expect(rules).toHaveProperty("no-branded-type-direct-construction");
    expect(rules).toHaveProperty("no-branded-value-mutation");
    expect(rules).toHaveProperty("suggest-brand-candidates");
  });

  it("exports default plugin with rules", () => {
    expect(plugin.rules).toBe(rules);
  });

  it("exports recommended config with all rules and test ignores", () => {
    const config = plugin.configs.recommended;
    expect(config.rules).toEqual({
      "branded-types/no-branded-type-cast": "error",
      "branded-types/no-branded-type-direct-construction": "error",
      "branded-types/no-branded-value-mutation": "error",
      "branded-types/suggest-brand-candidates": "warn",
    });
    expect(config.ignores).toEqual(["**/*.test.*", "**/*.spec.*"]);
  });

  it("exports all config without test ignores", () => {
    const config = plugin.configs.all;
    expect(config.rules).toEqual({
      "branded-types/no-branded-type-cast": "error",
      "branded-types/no-branded-type-direct-construction": "error",
      "branded-types/no-branded-value-mutation": "error",
      "branded-types/suggest-brand-candidates": "warn",
    });
    expect(config.ignores).toBeUndefined();
  });

  it("recommended config self-references the plugin", () => {
    const config = plugin.configs.recommended;
    expect(config.plugins).toBeDefined();
    expect(config.plugins!["branded-types"]).toBe(plugin);
  });

  it("all rules have a valid meta.type", () => {
    const allowed = new Set(["problem", "suggestion", "layout"]);
    for (const rule of Object.values(rules)) {
      expect(allowed.has(rule.meta?.type as string)).toBe(true);
    }
  });

  it("all rules have docs.description", () => {
    for (const [name, rule] of Object.entries(rules)) {
      expect(
        rule.meta?.docs?.description,
        `${name} missing description`
      ).toBeTruthy();
    }
  });
});

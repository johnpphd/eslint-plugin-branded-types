import { describe, it, expect } from "vitest";
import plugin, { rules } from "../src/index.js";

describe("plugin exports", () => {
  it("exports all three rules", () => {
    expect(rules).toHaveProperty("no-branded-type-cast");
    expect(rules).toHaveProperty("no-branded-type-direct-construction");
    expect(rules).toHaveProperty("no-branded-value-mutation");
  });

  it("exports default plugin with rules", () => {
    expect(plugin.rules).toBe(rules);
  });

  it("exports recommended config with all rules as error and test ignores", () => {
    const config = plugin.configs.recommended;
    expect(config.rules).toEqual({
      "branded-types/no-branded-type-cast": "error",
      "branded-types/no-branded-type-direct-construction": "error",
      "branded-types/no-branded-value-mutation": "error",
    });
    expect(config.ignores).toEqual(["**/*.test.*", "**/*.spec.*"]);
  });

  it("exports all config without test ignores", () => {
    const config = plugin.configs.all;
    expect(config.rules).toEqual({
      "branded-types/no-branded-type-cast": "error",
      "branded-types/no-branded-type-direct-construction": "error",
      "branded-types/no-branded-value-mutation": "error",
    });
    expect(config.ignores).toBeUndefined();
  });

  it("recommended config self-references the plugin", () => {
    const config = plugin.configs.recommended;
    expect(config.plugins).toBeDefined();
    expect(config.plugins!["branded-types"]).toBe(plugin);
  });

  it("all three rules have correct meta.type", () => {
    for (const rule of Object.values(rules)) {
      expect(rule.meta?.type).toBe("problem");
    }
  });

  it("all three rules have docs.description", () => {
    for (const [name, rule] of Object.entries(rules)) {
      expect(
        rule.meta?.docs?.description,
        `${name} missing description`
      ).toBeTruthy();
    }
  });
});

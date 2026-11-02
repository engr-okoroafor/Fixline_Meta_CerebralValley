import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
describe("admin settings defaults", () => {
  it("Meta primary, NVIDIA fallback, US / en-US", () => {
    expect(DEFAULT_SETTINGS.ai.primary).toBe("meta");
    expect(DEFAULT_SETTINGS.ai.fallback).toBe("nvidia");
    expect(DEFAULT_SETTINGS.defaults.region).toBe("US");
    expect(DEFAULT_SETTINGS.defaults.lang).toBe("en-US");
    expect(DEFAULT_SETTINGS.flags.mcpWrites).toBe(false);
  });
});

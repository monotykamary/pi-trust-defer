/**
 * Unit tests for constants.
 */

import { describe, it, expect } from "vitest";
import { TRUSTNOW_DESCRIPTION } from "../../src/constants.js";

describe("TRUSTNOW_DESCRIPTION", () => {
  it("is a non-empty string", () => {
    expect(typeof TRUSTNOW_DESCRIPTION).toBe("string");
    expect(TRUSTNOW_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it("contains 'trust' and 'reload'", () => {
    expect(TRUSTNOW_DESCRIPTION.toLowerCase()).toContain("trust");
    expect(TRUSTNOW_DESCRIPTION.toLowerCase()).toContain("reload");
  });
});

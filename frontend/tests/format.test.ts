import { describe, expect, it } from "vitest";

import { formatRelative } from "@/lib/format";

describe("formatRelative", () => {
  it("shows 'just now' for the current time", () => {
    expect(formatRelative(new Date().toISOString())).toBe("just now");
  });

  it("formats minutes and hours ago", () => {
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelative(fiveMin)).toBe("5m ago");

    const threeHrs = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelative(threeHrs)).toBe("3h ago");
  });

  it("treats a zone-less timestamp as UTC (SQLite-style)", () => {
    // "YYYY-MM-DDTHH:MM:SS" with no zone must be read as UTC, not local time.
    const naiveUtc = new Date(Date.now() - 5 * 60 * 1000)
      .toISOString()
      .slice(0, 19);
    expect(formatRelative(naiveUtc)).toBe("5m ago");
  });

  it("returns empty string for an invalid date", () => {
    expect(formatRelative("not-a-date")).toBe("");
  });
});

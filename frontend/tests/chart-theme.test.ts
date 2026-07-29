import { describe, expect, it } from "vitest";

import { chartColors } from "@/lib/chart-theme";

describe("chartColors", () => {
  it("returns the dark palette for the dark theme", () => {
    expect(chartColors("dark").series).toBe("#3987e5");
  });

  it("returns the light palette otherwise", () => {
    expect(chartColors("light").series).toBe("#2a78d6");
    expect(chartColors(undefined).series).toBe("#2a78d6");
  });
});

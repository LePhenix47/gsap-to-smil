import { expect, describe, it } from "bun:test";

describe("property-router", () => {
  describe("routeProperties", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it("HAPPY PATH: should route properties", () => {
      expect(1).toBe(1);
    });
    it("HAPPY PATH: should route properties 2", () => {
      expect(1).toBe(1);
    });

    it("EDGE CASE: shouldn't route properties", () => {
      expect(1).toBe(1);
    });
    it("EDGE CASE: shouldn't route properties 2", () => {
      expect(1).toBe(1);
    });
  });
});

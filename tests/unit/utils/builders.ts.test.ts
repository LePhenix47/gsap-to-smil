/// <reference lib="dom" />

import { describe, expect, it } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

describe("builders", () => {
  describe("buildAnimate", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should route properties 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't route properties 2", () => {
      expect(1).toBe(1);
    });
  });
  describe("buildAnimateTransform", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should route properties 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't route properties 2", () => {
      expect(1).toBe(1);
    });
  });
  describe("buildSet", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should route properties 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't route properties 2", () => {
      expect(1).toBe(1);
    });
  });
  describe("injectInto", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should route properties 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't route properties", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't route properties 2", () => {
      expect(1).toBe(1);
    });
  });
});

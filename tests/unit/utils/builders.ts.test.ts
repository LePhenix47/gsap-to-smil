/// <reference lib="dom" />
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

import { describe, expect, it } from "bun:test";
import {
  buildAnimate,
  buildAnimateTransform,
  buildSet,
  injectInto,
} from "@/utils/builders";

describe("builders", () => {
  describe("buildAnimate", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should do stuff 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't do stuff 2", () => {
      expect(1).toBe(1);
    });
  });

  describe("buildAnimateTransform", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should do stuff 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't do stuff 2", () => {
      expect(1).toBe(1);
    });
  });

  describe("buildSet", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should do stuff 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't do stuff 2", () => {
      expect(1).toBe(1);
    });
  });
  describe("injectInto", () => {
    // ? one describe per function in the file
    // * Test paths, HAPPY PATHs and EDGE CASEs, (order is important, fist HP then EC)
    it.todo("HAPPY PATH: should do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("HAPPY PATH: should do stuff 2", () => {
      expect(1).toBe(1);
    });

    it.todo("EDGE CASE: shouldn't do stuff", () => {
      expect(1).toBe(1);
    });
    it.todo("EDGE CASE: shouldn't do stuff 2", () => {
      expect(1).toBe(1);
    });
  });
});

import { describe, expect, it } from "bun:test";
import { TriggerResolver } from "@/utils/trigger-resolver.ts";

describe("TriggerResolver", () => {
  describe("resolve", () => {
    it("HAPPY PATH: undefined trigger returns null", () => {
      const el = document.createElement("div");
      expect(TriggerResolver.resolve(el, undefined)).toBeNull();
    });

    it("HAPPY PATH: simple 'hover' string → elementId.mouseover", () => {
      const el = document.createElement("div");
      el.id = "demo";

      const result = TriggerResolver.resolve(el, "hover");

      expect(result).toBe("demo.mouseover");
    });

    it("HAPPY PATH: TriggerConfig with explicit target → targetId.event", () => {
      const el = document.createElement("div");
      el.id = "btn";

      const result = TriggerResolver.resolve(el, { event: "click", target: "#card" });

      expect(result).toBe("#card.click");
    });

    it("HAPPY PATH: TriggerConfig without target → uses firstTarget id", () => {
      const el = document.createElement("div");
      el.id = "target";

      const result = TriggerResolver.resolve(el, { event: "click" });

      expect(result).toBe("target.click");
    });

    it("HAPPY PATH: multiple triggers → semicolon-separated", () => {
      const el = document.createElement("div");
      el.id = "el";

      const result = TriggerResolver.resolve(el, [
        "hover",
        { event: "click", target: "#btn" },
      ]);

      expect(result).toBe("el.mouseover; #btn.click");
    });

    it("HAPPY PATH: 'unhover' maps to mouseout", () => {
      const el = document.createElement("div");
      el.id = "el";

      const result = TriggerResolver.resolve(el, "unhover");

      expect(result).toBe("el.mouseout");
    });

    it("HAPPY PATH: 'focus' maps to focusin, 'blur' maps to focusout", () => {
      const el = document.createElement("div");
      el.id = "el";

      const focusResult = TriggerResolver.resolve(el, "focus");
      const blurResult = TriggerResolver.resolve(el, "blur");

      expect(focusResult).toBe("el.focusin");
      expect(blurResult).toBe("el.focusout");
    });
  });

  describe("resolveId", () => {
    it("HAPPY PATH: returns existing id", () => {
      const el = document.createElement("div");
      el.id = "existing";

      expect(TriggerResolver.resolveId(el)).toBe("existing");
    });

    it("HAPPY PATH: auto-generates id when none exists", () => {
      const el = document.createElement("div");

      const id = TriggerResolver.resolveId(el);

      expect(id).toMatch(/^smil-tg-\d+$/);
      expect(el.id).toBe(id);
    });

    it("HAPPY PATH: auto-generated ids are unique", () => {
      const el1 = document.createElement("div");
      const el2 = document.createElement("div");

      const id1 = TriggerResolver.resolveId(el1);
      const id2 = TriggerResolver.resolveId(el2);

      expect(id1).not.toBe(id2);
    });
  });

  describe("resolveEvent", () => {
    it("HAPPY PATH: 'hover' → mouseover", () => {
      expect(TriggerResolver.resolveEvent("hover")).toBe("mouseover");
    });

    it("HAPPY PATH: 'unhover' → mouseout", () => {
      expect(TriggerResolver.resolveEvent("unhover")).toBe("mouseout");
    });

    it("HAPPY PATH: 'click' → click (passthrough)", () => {
      expect(TriggerResolver.resolveEvent("click")).toBe("click");
    });

    it("HAPPY PATH: 'focus' → focusin", () => {
      expect(TriggerResolver.resolveEvent("focus")).toBe("focusin");
    });

    it("EDGE CASE: unknown event passes through as-is", () => {
      expect(TriggerResolver.resolveEvent("custom")).toBe("custom");
    });
  });
});

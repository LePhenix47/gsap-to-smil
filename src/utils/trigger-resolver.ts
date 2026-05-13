import type { TriggerConfig } from "@/types/tween-vars.type.ts";

/** Monotonically incrementing counter for auto-generated trigger element IDs. */
let triggerIdCounter = 0;

const EVENT_MAP = new Map<string, string>([
  ["hover", "mouseover"],
  ["unhover", "mouseout"],
  ["mouseenter", "mouseover"],
  ["mouseleave", "mouseout"],
  ["click", "click"],
  ["mousedown", "mousedown"],
  ["mouseup", "mouseup"],
  ["focus", "focusin"],
  ["blur", "focusout"],
  ["focusin", "focusin"],
  ["focusout", "focusout"],
]);

export class TriggerResolver {
  /**
   * Resolves a `trigger` config to a SMIL `begin` string.
   *
   * Returns `null` if `trigger` is `undefined` or empty.
   */
  static resolve = (
    firstTarget: Element,
    trigger: string | TriggerConfig | (string | TriggerConfig)[] | undefined,
  ): string | null => {
    if (!trigger) return null;

    const triggerArray = TriggerResolver.normalize(trigger);

    if (triggerArray.length === 0) return null;

    const resolvedTriggers = triggerArray.map((entry) =>
      TriggerResolver.resolveSingle(firstTarget, entry),
    );

    return resolvedTriggers.join("; ");
  };

  /** Ensures the trigger is always an array of TriggerConfig. */
  private static normalize = (
    trigger: string | TriggerConfig | (string | TriggerConfig)[],
  ): TriggerConfig[] => {
    if (Array.isArray(trigger)) {
      return trigger.map((entry) =>
        typeof entry === "string" ? { event: entry } as TriggerConfig : entry,
      );
    }

    return [typeof trigger === "string" ? { event: trigger } as TriggerConfig : trigger];
  };

  /** Valid SMIL begin ID pattern — only alphanumeric + underscore. Hyphens/dots parsed as operators. */
  private static readonly SAFE_ID = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  /** Resolves a single TriggerConfig to `"elementId.eventName"`. */
  private static resolveSingle = (
    firstTarget: Element,
    config: TriggerConfig,
  ): string => {
    const smilEvent = TriggerResolver.resolveEvent(config.event);
    const element = TriggerResolver.resolveTarget(config.target, firstTarget);

    const elementId = element !== null
      ? TriggerResolver.resolveId(element)
      : TriggerResolver.extractIdFromSelector(config.target!);

    if (!TriggerResolver.SAFE_ID.test(elementId)) {
      console.warn(
        `[gsap-to-smil] Element id="${elementId}" contains characters unsafe for SMIL ` +
        `begin (hyphens, dots, colons are parsed as math operators). ` +
        `Rename the element to use only letters, numbers, and underscores, e.g. id="cardSmil".`,
      );
    }

    return `${elementId}.${smilEvent}`;
  };

  /**
   * Resolves a target string to an Element, or `null` when no match is found.
   *
   * Tries `getElementById` first (strip `#` prefix), then camelCase variant, then `querySelector`.
   * Returns `null` when nothing matches — caller extracts the id directly from the selector string.
   */
  private static resolveTarget = (
    target: string | undefined,
    firstTarget: Element,
  ): Element | null => {
    if (!target) return firstTarget;

    const id = target.startsWith("#") ? target.slice(1) : target;

    const byId = document.getElementById(id);
    if (byId) return byId;

    // Try camelCase version (element may have been renamed by a previous trigger)
    const camelId = id.replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase());
    if (camelId !== id) {
      const byCamel = document.getElementById(camelId);
      if (byCamel) return byCamel;
    }

    const bySelector = document.querySelector(target);
    if (bySelector) return bySelector;

    console.warn(
      `[gsap-to-smil] Trigger target "${target}" not found in DOM. Using id from selector string.`,
    );
    return null;
  };

  /** Strips `#` prefix from a CSS id selector to get a bare id string. */
  private static extractIdFromSelector = (selector: string): string =>
    selector.startsWith("#") ? selector.slice(1) : selector;

  /** Maps user-friendly event names to SMIL-compatible names. */
  static resolveEvent = (event: string): string => {
    return EVENT_MAP.get(event) ?? event;
  };

  /** Returns a SMIL-safe element `id`, auto-generating or sanitizing as needed. */
  static resolveId = (element: Element): string => {
    if (element.id && TriggerResolver.SAFE_ID.test(element.id)) {
      return element.id;
    }

    // Auto-generate or sanitize: convert kebab-case → camelCase, replace unsafe chars
    const safeId = element.id
      ? element.id.replace(/-([a-z])/g, (_: string, letter: string) => letter.toUpperCase())
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/^[^a-zA-Z_]/, "_$&")
      : `smilTg${++triggerIdCounter}`;

    if (element.id) {
      console.warn(
        `[gsap-to-smil] Element id="${element.id}" renamed to "${safeId}" ` +
        `— SMIL begin cannot parse hyphens/dots/colons (they are math operators). ` +
        `Update your CSS/JS selectors to "#${safeId}" if needed.`,
      );
    }

    element.id = safeId;
    return safeId;
  };
}

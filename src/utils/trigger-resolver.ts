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
        typeof entry === "string" ? { event: entry } : entry,
      );
    }

    return [typeof trigger === "string" ? { event: trigger } : trigger];
  };

  /** Resolves a single TriggerConfig to `"elementId.eventName"`. */
  private static resolveSingle = (
    firstTarget: Element,
    config: TriggerConfig,
  ): string => {
    const smilEvent = TriggerResolver.resolveEvent(config.event);
    const elementId = config.target
      ?? TriggerResolver.resolveId(firstTarget);

    return `${elementId}.${smilEvent}`;
  };

  /** Maps user-friendly event names to SMIL-compatible names. */
  static resolveEvent = (event: string): string => {
    return EVENT_MAP.get(event) ?? event;
  };

  /** Returns the element's `id`, auto-generating one if needed. */
  static resolveId = (element: Element): string => {
    if (element.id) return element.id;

    const generatedId = `smil-tg-${++triggerIdCounter}`;
    element.id = generatedId;
    return generatedId;
  };
}

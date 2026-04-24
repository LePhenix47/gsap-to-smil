import type {
  TweenVars,
  PropertyBuckets,
  TransformProps,
  DirectProps,
  SpecialProps,
  AttrVars,
} from "@/types/index.ts";

// ===== Key sets =====

const SPECIAL_KEYS = new Set<string>([
  "duration",
  "delay",
  "ease",
  "repeat",
  "repeatDelay",
  "yoyo",
  "yoyoEase",
  "stagger",
  "paused",
  "reversed",
  "id",
  "data",
  "immediateRender",
  "transformOrigin",
  "onStart",
  "onStartParams",
  "onUpdate",
  "onUpdateParams",
  "onComplete",
  "onCompleteParams",
  "onRepeat",
  "onRepeatParams",
  "onReverseComplete",
  "onReverseCompleteParams",
]);

const TRANSFORM_KEYS = new Set<string>([
  "x",
  "y",
  "z",
  "xPercent",
  "yPercent",
  "rotation",
  "rotationX",
  "rotationY",
  "scale",
  "scaleX",
  "scaleY",
  "skewX",
  "skewY",
]);

const DIRECT_KEYS = new Set<string>([
  "opacity",
  "fill",
  "stroke",
  "fillOpacity",
  "strokeOpacity",
  "strokeWidth",
  "strokeDashoffset",
  "strokeDasharray",
]);

const PLUGIN_KEYS = new Set<string>(["drawSVG", "motionPath", "morphSVG"]);

// ===== Defaults =====

const SPECIAL_DEFAULTS: SpecialProps = {
  duration: 0.5,
  delay: 0,
  ease: "power1.out",
  repeat: 0,
  repeatDelay: 0,
  yoyo: false,
  yoyoEase: undefined,
  stagger: undefined,
  paused: false,
  reversed: false,
  id: undefined,
  data: undefined,
  immediateRender: false,
  transformOrigin: undefined,
  onStart: undefined,
  onStartParams: undefined,
  onComplete: undefined,
  onCompleteParams: undefined,
  onRepeat: undefined,
  onRepeatParams: undefined,
  onReverseComplete: undefined,
  onReverseCompleteParams: undefined,
};

// ===== Router =====

/**
 * Splits a flat `TweenVars` object into five typed buckets.
 * This is the single place in the codebase that decides what each key means.
 * All downstream consumers (builders, transform-composer, plugins) only see their slice.
 *
 * Any unrecognised key falls into `direct` as a best-effort SVG presentation attribute.
 */
export const routeProperties = (vars: TweenVars): PropertyBuckets => {
  const transforms: TransformProps = {};
  const direct: DirectProps = {};
  const attrs: AttrVars = structuredClone(vars.attr) || {};
  const special: SpecialProps = { ...SPECIAL_DEFAULTS };
  const plugins: PropertyBuckets["plugins"] = {};

  for (const [key, value] of Object.entries(vars)) {
    if (key === "attr") continue;

    if (SPECIAL_KEYS.has(key)) {
      (special as unknown as Record<string, unknown>)[key] = value;
      continue;
    }

    if (TRANSFORM_KEYS.has(key)) {
      (transforms as Record<string, unknown>)[key] = value;
      continue;
    }

    if (DIRECT_KEYS.has(key)) {
      direct[key] = value as string;
      continue;
    }

    if (PLUGIN_KEYS.has(key)) {
      (plugins as Record<string, unknown>)[key] = value;
      continue;
    }

    // Unknown key — best-effort SVG presentation attribute
    direct[key] = value as string;
  }

  return { transforms, direct, attrs, special, plugins };
};

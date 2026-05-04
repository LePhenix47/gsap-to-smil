import type {
  TweenVars,
  PropertyBuckets,
  TransformProps,
  DirectProps,
  SpecialProps,
  AttrVars,
} from "@/types/index.ts";

/**
 * Sorts a flat `TweenVars` object into five typed buckets so each downstream
 * layer only handles the keys it cares about.
 *
 * A GSAP tween vars object mixes everything together:
 * `{ x: 100, opacity: 0, duration: 1, ease: "power2.out", attr: { r: 20 } }`
 *
 * This router splits that into:
 * - **transforms** → `<animateTransform>` elements via `TransformComposer`
 * - **direct**    → `<animate>` elements via `SMILBuilder.animate()`
 * - **attrs**     → `<animate>` elements (from the `attr: {}` sub-object)
 * - **special**   → timing / easing / callbacks consumed by `SMILTween`
 * - **plugins**   → dispatched to `DrawSMILPlugin` / `MotionSMILPlugin` / `MorphSMILPlugin`
 *
 * Every tween passes through `route()` before any SMIL elements are built.
 */
export class PropertyRouter {
  /** GSAP tween control keys — routed to the special bucket with defaults applied. */
  private static readonly SPECIAL_KEYS = new Set<string>([
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

  /** GSAP transform shorthand keys — routed to the transforms bucket for `<animateTransform>`. */
  private static readonly TRANSFORM_KEYS = new Set<string>([
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

  /** SVG presentation attribute keys — routed to the direct bucket for `<animate>`. */
  private static readonly DIRECT_KEYS = new Set<string>([
    "opacity",
    "fill",
    "stroke",
    "fillOpacity",
    "strokeOpacity",
    "strokeWidth",
    "strokeDashoffset",
    "strokeDasharray",
  ]);

  /** Plugin dispatch keys — routed to the plugins bucket. */
  private static readonly PLUGIN_KEYS = new Set<string>([
    "drawSVG",
    "motionPath",
    "morphSVG",
  ]);

  /**
   * Default values for every timing / control key, matching GSAP's own defaults.
   *
   * When a key is absent from `vars`, the default from this object fills it in.
   * Callers always receive a complete `SpecialProps` — never a partial one.
   *
   * Key defaults: `duration` = 0.5s, `ease` = `"power1.out"`, `repeat` = 0,
   * `yoyo` = false, `paused` = false, `reversed` = false, `immediateRender` = false.
   * All optional fields (`id`, `data`, callbacks, `stagger`, `transformOrigin`)
   * default to `undefined`.
   */
  private static readonly SPECIAL_DEFAULTS: SpecialProps = {
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

  /**
   * Checks whether `key` is in `knownKeys`, and if so assigns `value` to
   * `target[key]`.
   *
   * Extracted because the special, transforms, and plugins buckets all follow
   * the same pattern: check a Set, assign the value, continue. Without this
   * helper each bucket would repeat the same `Set.has()` + cast dance.
   *
   * The `key as keyof T` and `value as T[keyof T]` casts are necessary because
   * TypeScript cannot correlate `Set.has()` with bracket-notation property
   * access. At runtime the `knownKeys.has(key)` check guarantees both casts
   * are safe.
   */
  private static assignKnownKey<T extends Record<string, unknown>>(
    target: T,
    key: string,
    value: unknown,
    knownKeys: ReadonlySet<string>,
  ): void {
    if (knownKeys.has(key)) {
      target[key as keyof T] = value as T[keyof T];
    }
  }

  /**
   * Iterates over every key in `vars` and sorts it into the correct bucket
   * by checking against `SPECIAL_KEYS`, `TRANSFORM_KEYS`, `DIRECT_KEYS`, and
   * `PLUGIN_KEYS` — in that order.
   *
   * - Keys matching a known Set go to their typed bucket.
   * - The `attr` sub-object is deep-cloned so mutations after the call don't
   *   affect the returned bucket.
   * - Unknown keys fall into `direct` as best-effort SVG presentation attributes
   *   (the browser will ignore them if they're not valid SVG attribute names).
   * - Absent special keys are pre-filled from `SPECIAL_DEFAULTS`, so callers
   *   always get a complete `SpecialProps` object.
   */
  static route(vars: TweenVars): PropertyBuckets {
    const transforms: TransformProps = {};
    const direct: DirectProps = {};
    const attrs: AttrVars = structuredClone(vars.attr) || {};
    const special: SpecialProps = { ...PropertyRouter.SPECIAL_DEFAULTS };
    const plugins: PropertyBuckets["plugins"] = {};

    for (const [key, value] of Object.entries(vars)) {
      if (key === "attr") {
        console.warn(
          "[gsap-to-smil] The `attr` key has not been implemented yet and will be ignored.",
        );
        continue;
      }

      if (PropertyRouter.SPECIAL_KEYS.has(key)) {
        PropertyRouter.assignKnownKey(
          special,
          key,
          value,
          PropertyRouter.SPECIAL_KEYS,
        );
        continue;
      }

      if (PropertyRouter.TRANSFORM_KEYS.has(key)) {
        PropertyRouter.assignKnownKey(
          transforms,
          key,
          value,
          PropertyRouter.TRANSFORM_KEYS,
        );
        continue;
      }

      if (PropertyRouter.DIRECT_KEYS.has(key)) {
        direct[key] = value as string;
        continue;
      }

      if (PropertyRouter.PLUGIN_KEYS.has(key)) {
        PropertyRouter.assignKnownKey(
          plugins,
          key,
          value,
          PropertyRouter.PLUGIN_KEYS,
        );
        continue;
      }

      direct[key] = value as string;
    }

    return { transforms, direct, attrs, special, plugins };
  }
}

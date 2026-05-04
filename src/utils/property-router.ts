import type {
  TweenVars,
  PropertyBuckets,
  TransformProps,
  DirectProps,
  SpecialProps,
  AttrVars,
} from "@/types/index.ts";

// ! Missing JSDoc
export class PropertyRouter {
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

  private static readonly PLUGIN_KEYS = new Set<string>([
    "drawSVG",
    "motionPath",
    "morphSVG",
  ]);

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

      // ! Although the code is readable & intelligible, my pet peeve though is the type assertion: as unknown as Record<string, unknown>, that's terrible
      // ! Note: I already tried multiple times to refactor this type the code became unreadable
      if (PropertyRouter.SPECIAL_KEYS.has(key)) {
        (special as unknown as Record<string, unknown>)[key] = value;
        continue;
      }

      if (PropertyRouter.TRANSFORM_KEYS.has(key)) {
        (transforms as Record<string, unknown>)[key] = value;
        continue;
      }

      if (PropertyRouter.DIRECT_KEYS.has(key)) {
        direct[key] = value as string;
        continue;
      }

      if (PropertyRouter.PLUGIN_KEYS.has(key)) {
        (plugins as Record<string, unknown>)[key] = value;
        continue;
      }

      direct[key] = value as string;
    }

    return { transforms, direct, attrs, special, plugins };
  }
}

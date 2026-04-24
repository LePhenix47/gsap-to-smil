import { Animation } from "./Animation.ts";
import type {
  TweenVars,
  TweenTarget,
  TransformProps,
  DirectProps,
} from "@/types/index.ts";
import { routeProperties } from "@/utils/property-router.ts";
import { composeTransforms } from "@/utils/transform-composer.ts";
import { resolveStaggerDelays } from "@/utils/stagger-resolver.ts";
import { buildAnimate, injectInto } from "@/utils/builders.ts";

/**
 * A single GSAP-style tween that generates SMIL elements and injects them into the DOM.
 * Instantiated by `smil.to()`, `smil.from()`, and `smil.fromTo()`.
 *
 * Pass `fromVars` for `fromTo()`, or `isFrom = true` for `from()`.
 */
export class SMILTween extends Animation {
  _targets: Element[];
  _vars: TweenVars;
  _fromVars: TweenVars | null;
  _isFrom: boolean;
  _elements: SVGAnimationElement[] = [];

  private _originalValues = new Map<Element, Record<string, string | null>>();

  constructor(
    targets: TweenTarget,
    vars: TweenVars,
    fromVars?: TweenVars | null,
    isFrom = false,
  ) {
    super(vars);
    this._vars = vars;
    this._fromVars = fromVars ?? null;
    this._isFrom = isFrom;
    this._targets = this._resolveTargets(targets);
    this._build();
  }

  // ===== Target resolution =====

  /** Normalizes any TweenTarget form into a flat `Element[]`. */
  private _resolveTargets = (targets: TweenTarget): Element[] => {
    if (typeof targets === "string") {
      return Array.from(document.querySelectorAll<Element>(targets));
    }

    if (targets instanceof Element) {
      return [targets];
    }

    if (targets instanceof NodeList) {
      return Array.from(targets) as Element[];
    }

    if (Array.isArray(targets)) {
      return targets.flatMap((t) =>
        typeof t === "string"
          ? Array.from(document.querySelectorAll<Element>(t))
          : [t as Element],
      );
    }

    return [];
  };

  // ===== Build =====

  /**
   * Derives identity transform values from the active keys of a `TransformProps` object.
   * Used by `from()` to produce the "animate TO neutral state" endpoint.
   */
  private _identityFor = (transforms: TransformProps): TransformProps => {
    const identity: TransformProps = {};
    if ("x" in transforms || "xPercent" in transforms) identity.x = 0;
    if ("y" in transforms || "yPercent" in transforms) identity.y = 0;
    if ("rotation" in transforms) identity.rotation = 0;
    if ("scale" in transforms || "scaleX" in transforms || "scaleY" in transforms) identity.scale = 1;
    if ("skewX" in transforms) identity.skewX = 0;
    if ("skewY" in transforms) identity.skewY = 0;
    return identity;
  };

  /** Iterates targets, resolves per-target delays, builds and injects all SMIL elements. */
  private _build = (): void => {
    if (this._yoyo) {
      console.warn("[gsap-to-smil] yoyo is not yet supported — ignored.");
    }

    const { transforms, direct } = routeProperties(this._vars);
    const fromRouted = this._fromVars ? routeProperties(this._fromVars) : null;

    const staggerDelays = this._vars.stagger
      ? resolveStaggerDelays(this._targets.length, this._vars.stagger)
      : null;

    for (let i = 0; i < this._targets.length; i++) {
      const target = this._targets[i]!;
      const delay = this._delay + (staggerDelays?.[i] ?? 0);

      this._saveOriginals(target, transforms, direct);

      const elements: SVGAnimationElement[] = [
        ...this._buildTransforms(target, transforms, fromRouted?.transforms, delay),
        ...this._buildDirect(direct, fromRouted?.direct, delay),
      ];

      injectInto(target, ...elements);
      this._elements.push(...elements);
    }

    this._initialized = true;
  };

  /** Captures current attribute values before animating so `revert()` can restore them. */
  private _saveOriginals = (
    target: Element,
    transforms: TransformProps,
    direct: DirectProps,
  ): void => {
    const originals: Record<string, string | null> = {};

    if (Object.keys(transforms).length > 0) {
      originals["transform"] = target.getAttribute("transform");
    }
    for (const attr of Object.keys(direct)) {
      originals[attr] = target.getAttribute(attr);
    }

    this._originalValues.set(target, originals);
  };

  /** Creates `<animateTransform>` elements for all active transform keys. */
  private _buildTransforms = (
    target: Element,
    transforms: TransformProps,
    fromTransforms: TransformProps | undefined,
    delay: number,
  ): SVGAnimateTransformElement[] => {
    const timing = {
      dur: this._dur,
      delay: delay || undefined,
      repeat: this._repeat,
      ease: this._vars.ease,
    };

    if (this._isFrom) {
      return composeTransforms({
        target,
        fromTransforms: transforms,
        toTransforms: this._identityFor(transforms),
        transformOrigin: this._vars.transformOrigin,
        ...timing,
      });
    }

    if (fromTransforms) {
      return composeTransforms({
        target,
        fromTransforms,
        toTransforms: transforms,
        transformOrigin: this._vars.transformOrigin,
        ...timing,
      });
    }

    return composeTransforms({
      target,
      toTransforms: transforms,
      transformOrigin: this._vars.transformOrigin,
      ...timing,
    });
  };

  /** Creates `<animate>` elements for opacity, fill, stroke, and other direct SVG attributes. */
  private _buildDirect = (
    direct: DirectProps,
    fromDirect: DirectProps | undefined,
    delay: number,
  ): SVGAnimateElement[] => {
    const elements: SVGAnimateElement[] = [];

    for (const [attr, value] of Object.entries(direct)) {
      if (value === undefined) continue;

      const shared = {
        attributeName: attr,
        dur: this._dur,
        delay: delay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease,
      };

      if (this._isFrom) {
        elements.push(buildAnimate({ ...shared, from: String(value) }));
      } else if (fromDirect) {
        const fromValue = fromDirect[attr];
        elements.push(buildAnimate({
          ...shared,
          from: fromValue !== undefined ? String(fromValue) : undefined,
          to: String(value),
        }));
      } else {
        elements.push(buildAnimate({ ...shared, to: String(value) }));
      }
    }

    return elements;
  };

  // ===== Playback =====

  private _svgOwner = (): SVGSVGElement | null =>
    this._elements[0]?.ownerSVGElement ?? null;

  play = (): this => {
    this._paused = false;
    for (const el of this._elements) el.beginElement();
    return this;
  };

  pause = (): this => {
    this._paused = true;
    this._svgOwner()?.pauseAnimations();
    return this;
  };

  resume = (): this => {
    this._paused = false;
    this._svgOwner()?.unpauseAnimations();
    return this;
  };

  seek = (time: number): this => {
    this._svgOwner()?.setCurrentTime(time);
    return this;
  };

  restart = (): this => {
    for (const el of this._elements) el.beginElement();
    return this;
  };

  // ===== Cleanup =====

  kill = (): this => {
    for (const el of this._elements) el.remove();
    this._elements = [];
    this._initialized = false;
    return this;
  };

  revert = (): this => {
    this.kill();
    for (const [target, originals] of this._originalValues) {
      for (const [attr, value] of Object.entries(originals)) {
        if (value === null) {
          target.removeAttribute(attr);
        } else {
          target.setAttribute(attr, value);
        }
      }
    }
    this._originalValues.clear();
    return this;
  };
}

// src/core/Animation.ts
var animationIdCounter = 0;

class Animation {
  id;
  data;
  parent = null;
  delaySeconds;
  durationSeconds;
  totalDurationSeconds;
  repeatCount;
  repeatDelaySeconds;
  yoyoEnabled;
  pausedState;
  reversedState;
  hasBuilt;
  constructor(vars) {
    const {
      id,
      delay = 0,
      duration = 0.5,
      repeat = 0,
      repeatDelay = 0,
      yoyo = false,
      paused = false,
      reversed = false,
      data = null
    } = vars;
    this.id = id ?? `smil-${++animationIdCounter}`;
    this.delaySeconds = delay;
    this.durationSeconds = duration;
    this.repeatCount = repeat;
    this.repeatDelaySeconds = repeatDelay;
    this.yoyoEnabled = yoyo;
    this.pausedState = paused;
    this.reversedState = reversed;
    this.hasBuilt = false;
    this.data = data;
    this.totalDurationSeconds = this.computeTotalDuration();
  }
  duration = (value) => {
    if (this.isAbsent(value))
      return this.durationSeconds;
    this.durationSeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };
  totalDuration = (value) => {
    if (this.isAbsent(value))
      return this.totalDurationSeconds;
    if (this.repeatCount > 0) {
      const totalPlayCount = this.repeatCount + 1;
      const totalGapTimeSeconds = this.repeatDelaySeconds * this.repeatCount;
      this.durationSeconds = (value - totalGapTimeSeconds) / totalPlayCount;
    } else {
      this.durationSeconds = value;
    }
    this.totalDurationSeconds = value;
    return this;
  };
  delay = (value) => {
    if (this.isAbsent(value))
      return this.delaySeconds;
    this.delaySeconds = value;
    return this;
  };
  repeat = (value) => {
    if (this.isAbsent(value))
      return this.repeatCount;
    this.repeatCount = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };
  repeatDelay = (value) => {
    if (this.isAbsent(value))
      return this.repeatDelaySeconds;
    this.repeatDelaySeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };
  yoyo = (value) => {
    if (this.isAbsent(value))
      return this.yoyoEnabled;
    this.yoyoEnabled = value;
    return this;
  };
  paused = (value) => {
    if (this.isAbsent(value))
      return this.pausedState;
    this.pausedState = value;
    return this;
  };
  reversed = (value) => {
    if (this.isAbsent(value))
      return this.reversedState;
    this.reversedState = value;
    return this;
  };
  isActive = () => this.hasBuilt && !this.pausedState;
  invalidate = () => {
    this.hasBuilt = false;
    return this;
  };
  isAbsent = (value) => !value && ["undefined", "object"].includes(typeof value);
  computeTotalDuration = () => {
    if (this.repeatCount === -1)
      return Infinity;
    const totalPlayDurationSeconds = this.durationSeconds * (this.repeatCount + 1);
    const totalGapSeconds = this.repeatDelaySeconds * this.repeatCount;
    return totalPlayDurationSeconds + totalGapSeconds;
  };
}

// src/utils/property-router.ts
class PropertyRouter {
  static SPECIAL_KEYS = new Set([
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
    "trigger",
    "onReverseCompleteParams"
  ]);
  static TRANSFORM_KEYS = new Set([
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
    "skewY"
  ]);
  static DIRECT_KEYS = new Set([
    "opacity",
    "fill",
    "stroke",
    "fillOpacity",
    "strokeOpacity",
    "strokeWidth",
    "strokeDashoffset",
    "strokeDasharray"
  ]);
  static PLUGIN_KEYS = new Set([
    "drawSVG",
    "motionPath",
    "morphSVG"
  ]);
  static SPECIAL_DEFAULTS = {
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
    onReverseCompleteParams: undefined
  };
  static assignKnownKey(target, key, value, knownKeys) {
    if (knownKeys.has(key)) {
      target[key] = value;
    }
  }
  static route(vars) {
    const transforms = {};
    const direct = {};
    const attrs = structuredClone(vars.attr) || {};
    const special = { ...PropertyRouter.SPECIAL_DEFAULTS };
    const plugins = {};
    for (const [key, value] of Object.entries(vars)) {
      if (key === "attr") {
        continue;
      }
      if (PropertyRouter.SPECIAL_KEYS.has(key)) {
        PropertyRouter.assignKnownKey(special, key, value, PropertyRouter.SPECIAL_KEYS);
        continue;
      }
      if (PropertyRouter.TRANSFORM_KEYS.has(key)) {
        PropertyRouter.assignKnownKey(transforms, key, value, PropertyRouter.TRANSFORM_KEYS);
        continue;
      }
      if (PropertyRouter.DIRECT_KEYS.has(key)) {
        direct[key] = value;
        continue;
      }
      if (PropertyRouter.PLUGIN_KEYS.has(key)) {
        PropertyRouter.assignKnownKey(plugins, key, value, PropertyRouter.PLUGIN_KEYS);
        continue;
      }
      direct[key] = value;
    }
    return { transforms, direct, attrs, special, plugins };
  }
}

// src/utils/easing.ts
class Easing {
  static EASE_MAP = new Map(Object.entries({
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
    "power1.in": [0.55, 0.085, 0.68, 0.53],
    "power1.out": [0.25, 0.46, 0.45, 0.94],
    "power1.inOut": [0.455, 0.03, 0.515, 0.955],
    "power2.in": [0.55, 0.055, 0.675, 0.19],
    "power2.out": [0.215, 0.61, 0.355, 1],
    "power2.inOut": [0.645, 0.045, 0.355, 1],
    "power3.in": [0.895, 0.03, 0.685, 0.22],
    "power3.out": [0.165, 0.84, 0.44, 1],
    "power3.inOut": [0.77, 0, 0.175, 1],
    "power4.in": [0.755, 0.05, 0.855, 0.06],
    "power4.out": [0.23, 1, 0.32, 1],
    "power4.inOut": [0.86, 0, 0.07, 1],
    "sine.in": [0.47, 0, 0.745, 0.715],
    "sine.out": [0.39, 0.575, 0.565, 1],
    "sine.inOut": [0.445, 0.05, 0.55, 0.95],
    "circ.in": [0.6, 0.04, 0.98, 0.335],
    "circ.out": [0.075, 0.82, 0.165, 1],
    "circ.inOut": [0.785, 0.135, 0.15, 0.86],
    "expo.in": [0.95, 0.05, 0.795, 0.035],
    "expo.out": [0.19, 1, 0.22, 1],
    "expo.inOut": [1, 0, 0, 1]
  }));
  static resolveEase(ease) {
    if (Array.isArray(ease)) {
      if (ease.length !== 4) {
        throw new Error(`[gsap-to-smil] cubic-bezier array must have exactly 4 values, got ${ease.length}`);
      }
      if (ease.some((v) => v < 0 || v > 1)) {
        throw new Error(`[gsap-to-smil] in SMIL cubic-bezier values must be between 0 and 1`);
      }
      return ease;
    }
    if (Easing.isLinearEasing(ease)) {
      return null;
    }
    const normalized = ease.replace(/\(.*\)$/, "");
    if (normalized.startsWith("elastic") || normalized.startsWith("bounce") || normalized.startsWith("back")) {
      return null;
    }
    const bezier = Easing.EASE_MAP.get(normalized);
    if (!bezier) {
      throw new Error(`[gsap-to-smil] Unknown ease "${ease}". Use a named GSAP ease, "linear", or a [x1,y1,x2,y2] array.`);
    }
    return bezier;
  }
  static resolveCalcMode(ease) {
    if (!ease || typeof ease === "string" && Easing.isLinearEasing(ease)) {
      return "linear";
    }
    const bezier = Easing.resolveEase(ease);
    if (!bezier) {
      console.warn(`[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`);
      return "linear";
    }
    return "spline";
  }
  static resolveKeyTimes(intervalCount) {
    const keyTimesArray = [0];
    const increment = 1 / intervalCount;
    for (let i = 0;i < intervalCount; i++) {
      const previousValue = keyTimesArray.at(-1);
      keyTimesArray.push(previousValue + increment);
    }
    keyTimesArray[keyTimesArray.length - 1] = 1;
    return keyTimesArray.map((value) => parseFloat(value.toFixed(6)).toString()).join("; ");
  }
  static resolveKeySplines(ease, intervalCount) {
    if (!intervalCount) {
      throw new Error("[gsap-to-smil] intervalCount must be a positive integer");
    }
    const bezier = Easing.resolveEase(ease);
    if (!bezier) {
      return null;
    }
    const stringBezier = bezier.join(" ");
    const splines = Array.from({ length: intervalCount }, () => stringBezier);
    return splines.join("; ");
  }
  static isLinearEasing(ease) {
    return ["none", "linear"].includes(ease);
  }
}

// src/utils/builders.ts
class SMILBuilder {
  static SVG_NS = "http://www.w3.org/2000/svg";
  static applyEasing(element, ease, intervalCount) {
    const calcMode = Easing.resolveCalcMode(ease);
    element.setAttribute("calcMode", calcMode);
    if (calcMode !== "spline") {
      return;
    }
    const keyTimes = Easing.resolveKeyTimes(intervalCount);
    const keySplines = Easing.resolveKeySplines(ease, intervalCount);
    if (keyTimes)
      element.setAttribute("keyTimes", keyTimes);
    if (keySplines)
      element.setAttribute("keySplines", keySplines);
  }
  static applyTiming(element, timingOptions) {
    element.setAttribute("dur", `${timingOptions.dur}s`);
    element.setAttribute("fill", timingOptions.fill ?? "freeze");
    if (timingOptions.delay) {
      element.setAttribute("begin", `${timingOptions.delay}s`);
    }
    if (timingOptions.repeat !== undefined && timingOptions.repeat !== 0) {
      const repeatCountValue = timingOptions.repeat === -1 ? "indefinite" : String(timingOptions.repeat + 1);
      element.setAttribute("repeatCount", repeatCountValue);
    }
  }
  static applyValues(element, valuesOptions) {
    if (valuesOptions.values !== undefined) {
      element.setAttribute("values", valuesOptions.values);
      const intervalCount = valuesOptions.values.split(";").length - 1;
      SMILBuilder.applyEasing(element, valuesOptions.ease, intervalCount);
      return;
    }
    if (valuesOptions.from !== undefined) {
      element.setAttribute("from", valuesOptions.from);
    }
    if (valuesOptions.to !== undefined) {
      element.setAttribute("to", valuesOptions.to);
    }
    SMILBuilder.applyEasing(element, valuesOptions.ease, 1);
  }
  static animate(animationOptions) {
    const element = document.createElementNS(SMILBuilder.SVG_NS, "animate");
    element.setAttribute("attributeName", animationOptions.attributeName);
    SMILBuilder.applyValues(element, animationOptions);
    SMILBuilder.applyTiming(element, animationOptions);
    if (animationOptions.additive) {
      element.setAttribute("additive", animationOptions.additive);
    }
    return element;
  }
  static animateTransform(transformOptions) {
    const element = document.createElementNS(SMILBuilder.SVG_NS, "animateTransform");
    element.setAttribute("attributeName", "transform");
    element.setAttribute("attributeType", "XML");
    element.setAttribute("type", transformOptions.type);
    element.setAttribute("additive", transformOptions.additive ?? "sum");
    SMILBuilder.applyValues(element, transformOptions);
    SMILBuilder.applyTiming(element, transformOptions);
    return element;
  }
  static set(attributeName, to, delay) {
    const element = document.createElementNS(SMILBuilder.SVG_NS, "set");
    element.setAttribute("attributeName", attributeName);
    element.setAttribute("to", to);
    if (delay)
      element.setAttribute("begin", `${delay}s`);
    return element;
  }
  static injectInto(target, ...animationElements) {
    for (const animationElement of animationElements) {
      target.appendChild(animationElement);
    }
  }
}

// src/utils/transform-composer.ts
class TransformComposer {
  static TRANSLATE_KEYS = [
    "x",
    "y",
    "xPercent",
    "yPercent"
  ];
  static SCALE_KEYS = ["scale", "scaleX", "scaleY"];
  static WRAPPER_TRIGGER_KEYS = [
    "scale",
    "scaleX",
    "scaleY",
    "skewX",
    "skewY"
  ];
  static hasAnyKey(target, keys) {
    return keys.some((key) => (key in target));
  }
  static resolveOrigin(element, transformOrigin) {
    if (transformOrigin) {
      return TransformComposer.parseTransformOrigin(element, transformOrigin);
    }
    return TransformComposer.getBBoxCenter(element);
  }
  static isElementAnSvg(element) {
    return element instanceof SVGGraphicsElement;
  }
  static parseTransformOrigin(element, transformOrigin) {
    const [rawXValue = "50%", rawYValue = rawXValue] = transformOrigin.trim().split(/\s+/);
    function resolveCoordinate(rawValue, dimension) {
      if (!TransformComposer.isElementAnSvg(element)) {
        return 0;
      }
      const boundingBox = element.getBBox();
      const offset = dimension === "width" ? boundingBox.x : boundingBox.y;
      const percentValue = TransformComposer.resolvePercent(rawValue, dimension, element);
      return offset + percentValue;
    }
    return {
      cx: resolveCoordinate(rawXValue, "width"),
      cy: resolveCoordinate(rawYValue, "height")
    };
  }
  static getBBoxCenter(element) {
    if (!TransformComposer.isElementAnSvg(element)) {
      console.warn("[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).");
      return { cx: 0, cy: 0 };
    }
    const boundingBox = element.getBBox();
    const originX = boundingBox.x + boundingBox.width / 2;
    const originY = boundingBox.y + boundingBox.height / 2;
    return { cx: originX, cy: originY };
  }
  static resolvePercent(value, dimension, element) {
    if (typeof value !== "string" || !value.endsWith("%")) {
      return typeof value === "string" ? parseFloat(value) : value;
    }
    if (!TransformComposer.isElementAnSvg(element)) {
      console.warn("[gsap-to-smil] Cannot determine percent value — element not in rendered DOM. Falling back to 0.");
      return 0;
    }
    const boundingBox = element.getBBox();
    return parseFloat(value) / 100 * boundingBox[dimension];
  }
  static translateStr(translateX, translateY) {
    return `${translateX} ${translateY}`;
  }
  static rotateStr(angle, originX, originY) {
    return `${angle} ${originX} ${originY}`;
  }
  static scaleStr(scaleX, scaleY) {
    return `${scaleX} ${scaleY}`;
  }
  static resolveTranslate(from, to, target) {
    if (!TransformComposer.hasAnyKey(to, TransformComposer.TRANSLATE_KEYS)) {
      return null;
    }
    function resolveCoordinate(transforms, dimension, defaultValue = 0) {
      if (transforms.xPercent !== undefined) {
        return TransformComposer.resolvePercent(transforms.xPercent, dimension, target);
      } else if (transforms.yPercent !== undefined) {
        return TransformComposer.resolvePercent(transforms.yPercent, dimension, target);
      }
      return dimension === "width" ? Number(transforms.x ?? defaultValue) : Number(transforms.y ?? defaultValue);
    }
    const fromTranslateX = resolveCoordinate(from, "width");
    const fromTranslateY = resolveCoordinate(from, "height");
    const toTranslateX = resolveCoordinate(to, "width");
    const toTranslateY = resolveCoordinate(to, "height");
    return {
      type: "translate",
      from: TransformComposer.translateStr(fromTranslateX, fromTranslateY),
      to: TransformComposer.translateStr(toTranslateX, toTranslateY)
    };
  }
  static resolveRotate(from, to, originX, originY) {
    if (!("rotation" in to))
      return null;
    const fromRotation = from.rotation || 0;
    const toRotation = to.rotation || 0;
    return {
      type: "rotate",
      from: TransformComposer.rotateStr(fromRotation, originX, originY),
      to: TransformComposer.rotateStr(toRotation, originX, originY)
    };
  }
  static resolveScale(from, to) {
    if (!TransformComposer.hasAnyKey(to, TransformComposer.SCALE_KEYS)) {
      return null;
    }
    const fromScaleX = from.scale ?? from.scaleX ?? 1;
    const fromScaleY = from.scale ?? from.scaleY ?? 1;
    const toScaleX = to.scale ?? to.scaleX ?? 1;
    const toScaleY = to.scale ?? to.scaleY ?? 1;
    return {
      type: "scale",
      from: TransformComposer.scaleStr(fromScaleX, fromScaleY),
      to: TransformComposer.scaleStr(toScaleX, toScaleY)
    };
  }
  static resolveSkewX(from, to) {
    if (!("skewX" in to))
      return null;
    return {
      type: "skewX",
      from: String(from.skewX || 0),
      to: String(to.skewX || 0)
    };
  }
  static resolveSkewY(from, to) {
    if (!("skewY" in to))
      return null;
    return {
      type: "skewY",
      from: String(from.skewY || 0),
      to: String(to.skewY || 0)
    };
  }
  static buildPivotScaffold(element, originX, originY) {
    const parent = element.parentNode;
    if (!parent) {
      console.warn("[gsap-to-smil] Cannot build pivot scaffold — element not in DOM. Scale/skew origin ignored.");
      return null;
    }
    const nextSibling = element.nextSibling;
    const outer = document.createElementNS(SMILBuilder.SVG_NS, "g");
    const pivotIn = document.createElementNS(SMILBuilder.SVG_NS, "g");
    const inner = document.createElementNS(SMILBuilder.SVG_NS, "g");
    const pivotOut = document.createElementNS(SMILBuilder.SVG_NS, "g");
    pivotIn.setAttribute("transform", `translate(${originX},${originY})`);
    pivotOut.setAttribute("transform", `translate(${-originX},${-originY})`);
    pivotOut.appendChild(element);
    inner.appendChild(pivotOut);
    pivotIn.appendChild(inner);
    outer.appendChild(pivotIn);
    parent.insertBefore(outer, nextSibling);
    return { outer, inner };
  }
  static compose(composeOptions) {
    const {
      toTransforms: to,
      fromTransforms,
      target,
      transformOrigin
    } = composeOptions;
    const from = fromTransforms ?? {};
    if ("rotationX" in to || "rotationY" in to) {
      console.warn("[gsap-to-smil] rotationX / rotationY have no SMIL equivalent — skipped.");
    }
    const sharedTiming = {
      dur: composeOptions.dur,
      delay: composeOptions.delay,
      repeat: composeOptions.repeat,
      ease: composeOptions.ease
    };
    const needsWrapper = TransformComposer.hasAnyKey(to, TransformComposer.WRAPPER_TRIGGER_KEYS);
    const hasRotation = "rotation" in to;
    const origin = needsWrapper || hasRotation ? TransformComposer.resolveOrigin(target, transformOrigin) : { cx: 0, cy: 0 };
    const buildAnimationElement = (pair) => SMILBuilder.animateTransform({
      type: pair.type,
      from: pair.from,
      to: pair.to,
      additive: "sum",
      ...sharedTiming
    });
    const translatePair = TransformComposer.resolveTranslate(from, to, target);
    if (needsWrapper) {
      const rotatePair2 = hasRotation ? TransformComposer.resolveRotate(from, to, 0, 0) : null;
      const innerPairs = [
        rotatePair2,
        TransformComposer.resolveScale(from, to),
        TransformComposer.resolveSkewX(from, to),
        TransformComposer.resolveSkewY(from, to)
      ].filter((pair) => pair !== null);
      const innerAnimationElements = innerPairs.map(buildAnimationElement);
      const outerAnimationElements2 = translatePair ? [buildAnimationElement(translatePair)] : [];
      return {
        outerAnims: outerAnimationElements2,
        innerAnims: innerAnimationElements,
        needsWrapper: true,
        origin
      };
    }
    const rotatePair = hasRotation ? TransformComposer.resolveRotate(from, to, origin.cx, origin.cy) : null;
    const outerAnimationElements = [translatePair, rotatePair].filter((pair) => pair !== null).map(buildAnimationElement);
    return {
      outerAnims: outerAnimationElements,
      innerAnims: [],
      needsWrapper: false,
      origin
    };
  }
}

// src/utils/trigger-resolver.ts
var triggerIdCounter = 0;
var EVENT_MAP = new Map([
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
  ["focusout", "focusout"]
]);

class TriggerResolver {
  static resolve = (firstTarget, trigger) => {
    if (!trigger)
      return null;
    const triggerArray = TriggerResolver.normalize(trigger);
    if (triggerArray.length === 0)
      return null;
    const resolvedTriggers = triggerArray.map((entry) => TriggerResolver.resolveSingle(firstTarget, entry));
    return resolvedTriggers.join("; ");
  };
  static normalize = (trigger) => {
    if (Array.isArray(trigger)) {
      return trigger.map((entry) => typeof entry === "string" ? { event: entry } : entry);
    }
    return [typeof trigger === "string" ? { event: trigger } : trigger];
  };
  static SAFE_ID = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  static resolveSingle = (firstTarget, config) => {
    const smilEvent = TriggerResolver.resolveEvent(config.event);
    const element = TriggerResolver.resolveTarget(config.target, firstTarget);
    const elementId = element !== null ? TriggerResolver.resolveId(element) : TriggerResolver.extractIdFromSelector(config.target);
    if (!TriggerResolver.SAFE_ID.test(elementId)) {
      console.warn(`[gsap-to-smil] Element id="${elementId}" contains characters unsafe for SMIL ` + `begin (hyphens, dots, colons are parsed as math operators). ` + `Rename the element to use only letters, numbers, and underscores, e.g. id="cardSmil".`);
    }
    return `${elementId}.${smilEvent}`;
  };
  static resolveTarget = (target, firstTarget) => {
    if (!target)
      return firstTarget;
    const id = target.startsWith("#") ? target.slice(1) : target;
    const byId = document.getElementById(id);
    if (byId)
      return byId;
    const camelId = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (camelId !== id) {
      const byCamel = document.getElementById(camelId);
      if (byCamel)
        return byCamel;
    }
    const bySelector = document.querySelector(target);
    if (bySelector)
      return bySelector;
    console.warn(`[gsap-to-smil] Trigger target "${target}" not found in DOM. Using id from selector string.`);
    return null;
  };
  static extractIdFromSelector = (selector) => selector.startsWith("#") ? selector.slice(1) : selector;
  static resolveEvent = (event) => {
    return EVENT_MAP.get(event) ?? event;
  };
  static resolveId = (element) => {
    if (element.id && TriggerResolver.SAFE_ID.test(element.id)) {
      return element.id;
    }
    const safeId = element.id ? element.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[^a-zA-Z_]/, "_$&") : `smilTg${++triggerIdCounter}`;
    if (element.id) {
      console.warn(`[gsap-to-smil] Element id="${element.id}" renamed to "${safeId}" ` + `— SMIL begin cannot parse hyphens/dots/colons (they are math operators). ` + `Update your CSS/JS selectors to "#${safeId}" if needed.`);
    }
    element.id = safeId;
    return safeId;
  };
}

// src/utils/stagger-resolver.ts
class StaggerResolver {
  static resolveStep(count, stagger) {
    if (typeof stagger === "number") {
      return stagger;
    }
    if (stagger.each !== undefined) {
      return stagger.each;
    }
    if (stagger.amount !== undefined) {
      if (count <= 1) {
        return 0;
      }
      const step = stagger.amount / (count - 1);
      return step;
    }
    return 0;
  }
  static randomOrder(count) {
    const order = Array.from({ length: count }, (_, i) => i);
    if (count <= 1) {
      return order;
    }
    for (let i = order.length - 1;i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temporary = order[i];
      order[i] = order[j];
      order[j] = temporary;
    }
    return order;
  }
  static resolveMultipliers(count, from) {
    switch (from) {
      case undefined:
      case "start":
        return Array.from({ length: count }, (_, i) => i);
      case "end":
        return Array.from({ length: count }, (_, i) => count - 1 - i);
      case "center": {
        const center = (count - 1) / 2;
        return Array.from({ length: count }, (_, i) => Math.abs(i - center));
      }
      case "edges":
        return Array.from({ length: count }, (_, i) => Math.min(i, count - 1 - i));
      case "random":
        return StaggerResolver.randomOrder(count);
      default:
        return Array.from({ length: count }, (_, i) => Math.abs(i - from));
    }
  }
  static resolveDelays(count, stagger) {
    if (count === 0)
      return [];
    const step = StaggerResolver.resolveStep(count, stagger);
    const from = typeof stagger === "object" ? stagger.from : undefined;
    const multipliers = StaggerResolver.resolveMultipliers(count, from);
    return multipliers.map((m) => m * step);
  }
}

// src/core/SMILTween.ts
class SMILTween extends Animation {
  targetElements;
  animationElements = [];
  fromVarsRecord;
  isFromTween;
  originalAttributes = new Map;
  pivotScaffolds = [];
  constructor(targetParam, toVars, fromVarsInput, isFromFlag) {
    super(toVars);
    this.isFromTween = isFromFlag ?? false;
    this.fromVarsRecord = fromVarsInput ?? null;
    const resolved = SMILTween.resolveTargets(targetParam);
    this.targetElements = resolved;
    if (resolved.length === 0)
      return;
    this.originalAttributes = SMILTween.snapshotAttributes(resolved);
    const buckets = PropertyRouter.route(toVars);
    this.buildElements(toVars, buckets);
    this.hasBuilt = true;
  }
  static resolveTargets = (targetParam) => {
    if (typeof targetParam === "string") {
      return Array.from(document.querySelectorAll(targetParam));
    }
    if (targetParam instanceof NodeList) {
      return Array.from(targetParam);
    }
    if (Array.isArray(targetParam))
      return targetParam;
    return [targetParam];
  };
  static ANIMATABLE_ATTRIBUTES = new Set([
    "opacity",
    "fill",
    "stroke",
    "strokeWidth",
    "strokeOpacity",
    "fillOpacity"
  ]);
  static snapshotAttributes = (targets) => {
    const snapshot = new Map;
    for (const target of targets) {
      const attributeMap = new Map;
      for (const attributeName of SMILTween.ANIMATABLE_ATTRIBUTES) {
        attributeMap.set(attributeName, target.getAttribute(attributeName));
      }
      snapshot.set(target, attributeMap);
    }
    return snapshot;
  };
  buildElements = (toVars, buckets) => {
    const {
      delay = 0,
      ease,
      yoyo,
      transformOrigin,
      trigger,
      stagger
    } = toVars;
    const fromBuckets = this.fromVarsRecord ? PropertyRouter.route(this.fromVarsRecord) : null;
    const triggerBegin = this.targetElements.length > 0 ? TriggerResolver.resolve(this.targetElements[0], trigger) : null;
    const hasYoyo = yoyo === true && this.repeatCount !== 0;
    if (hasYoyo) {
      this.buildYoyoElements(toVars, buckets, fromBuckets, triggerBegin);
      return;
    }
    const isGroupRepeat = this.repeatCount === -1 && !this.isAbsent(stagger);
    if (isGroupRepeat) {
      this.buildGroupRepeatElements(toVars, buckets, fromBuckets, triggerBegin);
      return;
    }
    let fromTransforms;
    let toTransforms;
    if (this.isFromTween) {
      toTransforms = buckets.transforms;
      fromTransforms = {};
    } else {
      toTransforms = buckets.transforms;
      fromTransforms = fromBuckets?.transforms;
    }
    const hasTransforms = Object.keys(toTransforms).length > 0 || Object.keys(fromTransforms ?? {}).length > 0;
    const staggerDelays = this.isAbsent(stagger) ? this.targetElements.map(() => 0) : StaggerResolver.resolveDelays(this.targetElements.length, stagger);
    for (const [index, target] of this.targetElements.entries()) {
      const staggerDelay = staggerDelays[index] ?? 0;
      const totalDelay = delay + staggerDelay;
      this.buildDirectProperties(target, buckets, fromBuckets, totalDelay, { ease }, triggerBegin);
      this.buildAttrElements(target, buckets.attrs, fromBuckets?.attrs, totalDelay, { ease }, triggerBegin);
      if (hasTransforms) {
        this.buildTransformElements(target, toTransforms, fromTransforms ?? undefined, totalDelay, transformOrigin, { ease }, this.isFromTween, triggerBegin);
      }
    }
    if (!this.isAbsent(stagger) && staggerDelays.length > 0) {
      const maxStaggerDelay = Math.max(...staggerDelays);
      this.durationSeconds += maxStaggerDelay;
    }
  };
  buildYoyoElements = (toVars, buckets, fromBuckets, triggerBegin) => {
    const { delay = 0, ease, transformOrigin, stagger } = toVars;
    const totalPlays = this.repeatCount + 1;
    const durationSeconds = this.durationSeconds;
    const staggerDelays = this.isAbsent(stagger) ? this.targetElements.map(() => 0) : StaggerResolver.resolveDelays(this.targetElements.length, stagger);
    const maxStaggerDelay = Math.max(...staggerDelays, 0);
    const hasStagger = maxStaggerDelay > 0;
    const groupDuration = durationSeconds * totalPlays + maxStaggerDelay;
    for (const [index, target] of this.targetElements.entries()) {
      const staggerDelay = staggerDelays[index] ?? 0;
      const elementDelay = hasStagger ? delay : delay + staggerDelay;
      const waitSeconds = hasStagger ? staggerDelay : 0;
      const tailHold = hasStagger ? groupDuration - staggerDelay - durationSeconds * totalPlays : 0;
      for (const [attributeName, toValue] of Object.entries(buckets.direct)) {
        if (toValue === undefined)
          continue;
        const fromValue = target.getAttribute(attributeName) ?? "1";
        const { values: baseValues, dur: baseDur, repeatCount: baseRepeatCount } = SMILTween.computeYoyoEncoding(fromValue, String(toValue), totalPlays, durationSeconds, this.repeatCount);
        const finalValues = hasStagger ? SMILTween.applyStaggerPhasesToValues(baseValues, fromValue, String(toValue), waitSeconds, tailHold, totalPlays) : baseValues;
        const finalDur = hasStagger ? groupDuration : baseDur;
        const finalRepeatCount = hasStagger ? 1 : baseRepeatCount;
        const animationOptions = {
          attributeName,
          dur: finalDur,
          delay: elementDelay,
          ease
        };
        const element = SMILBuilder.animate(animationOptions);
        element.setAttribute("repeatCount", String(finalRepeatCount));
        element.setAttribute("values", finalValues);
        element.removeAttribute("from");
        element.removeAttribute("to");
        const yoyoIntervalCount = finalValues.split(";").length - 1;
        element.setAttribute("keyTimes", Easing.resolveKeyTimes(yoyoIntervalCount));
        SMILTween.applyYoyoEasing(element, ease, finalValues);
        this.injectAnimationElement(target, element, triggerBegin);
      }
      const hasTransforms = Object.keys(buckets.transforms).length > 0;
      if (!hasTransforms)
        continue;
      const fromTransforms = {};
      const result = TransformComposer.compose({
        toTransforms: buckets.transforms,
        fromTransforms,
        target,
        dur: durationSeconds,
        delay,
        repeat: this.repeatCount,
        ease,
        transformOrigin
      });
      for (const element of [...result.outerAnims, ...result.innerAnims]) {
        const from = element.getAttribute("from") ?? "";
        const to = element.getAttribute("to") ?? "";
        const { values, dur, repeatCount } = SMILTween.computeYoyoEncoding(from, to, totalPlays, durationSeconds, this.repeatCount);
        element.setAttribute("values", values);
        element.setAttribute("dur", `${dur}s`);
        element.setAttribute("repeatCount", String(repeatCount));
        element.removeAttribute("from");
        element.removeAttribute("to");
        const yoyoIntervalCount = values.split(";").length - 1;
        element.setAttribute("keyTimes", Easing.resolveKeyTimes(yoyoIntervalCount));
        SMILTween.applyYoyoEasing(element, ease, values);
        if (triggerBegin) {
          const existingBegin = element.getAttribute("begin");
          element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
        }
      }
      const allAnimationElements = [...result.outerAnims, ...result.innerAnims];
      if (result.needsWrapper) {
        const scaffold = TransformComposer.buildPivotScaffold(target, result.origin.cx, result.origin.cy);
        if (scaffold) {
          SMILBuilder.injectInto(scaffold.outer, ...result.outerAnims);
          SMILBuilder.injectInto(scaffold.inner, ...result.innerAnims);
          this.pivotScaffolds.push({
            ...scaffold,
            parent: target.parentNode,
            nextSibling: target.nextSibling
          });
        } else {
          SMILBuilder.injectInto(target, ...allAnimationElements);
        }
      } else {
        SMILBuilder.injectInto(target, ...result.outerAnims);
      }
      this.animationElements.push(...allAnimationElements);
    }
    if (hasStagger) {
      this.durationSeconds = groupDuration;
    }
  };
  buildGroupRepeatElements = (toVars, buckets, fromBuckets, triggerBegin) => {
    const { delay = 0, ease, transformOrigin, stagger } = toVars;
    if (this.isAbsent(stagger))
      return;
    const durationSeconds = this.durationSeconds;
    const staggerDelays = StaggerResolver.resolveDelays(this.targetElements.length, stagger);
    const maxStaggerDelay = Math.max(...staggerDelays);
    const groupPeriod = maxStaggerDelay + durationSeconds;
    const toTransforms = buckets.transforms;
    const fromTransforms = {};
    const hasTransforms = Object.keys(toTransforms).length > 0;
    for (const [index, target] of this.targetElements.entries()) {
      const staggerOffset = staggerDelays[index] ?? 0;
      for (const [attributeName, toValue] of Object.entries(buckets.direct)) {
        if (toValue === undefined)
          continue;
        const domFromValue = target.getAttribute(attributeName) ?? "0";
        const resolvedFromValue = fromBuckets?.direct[attributeName] !== undefined ? String(fromBuckets.direct[attributeName]) : domFromValue;
        const actualFromValue = this.isFromTween ? String(toValue) : resolvedFromValue;
        const actualToValue = this.isFromTween ? resolvedFromValue : String(toValue);
        const animationElement = document.createElementNS(SMILBuilder.SVG_NS, "animate");
        animationElement.setAttribute("attributeName", attributeName);
        SMILTween.applyGroupPeriodEncoding(animationElement, actualFromValue, actualToValue, staggerOffset, groupPeriod, durationSeconds, delay, ease);
        this.injectAnimationElement(target, animationElement, triggerBegin);
      }
      for (const [attributeName, toValue] of Object.entries(buckets.attrs)) {
        if (toValue === undefined || toValue === null)
          continue;
        const fromAttr = fromBuckets?.attrs[attributeName];
        const resolvedFromValue = fromAttr !== undefined && fromAttr !== null ? String(fromAttr) : target.getAttribute(attributeName) ?? "0";
        const animationElement = document.createElementNS(SMILBuilder.SVG_NS, "animate");
        animationElement.setAttribute("attributeName", attributeName);
        SMILTween.applyGroupPeriodEncoding(animationElement, resolvedFromValue, String(toValue), staggerOffset, groupPeriod, durationSeconds, delay, ease);
        this.injectAnimationElement(target, animationElement, triggerBegin);
      }
      if (!hasTransforms)
        continue;
      const result = TransformComposer.compose({
        toTransforms,
        fromTransforms,
        target,
        dur: durationSeconds,
        delay: 0,
        repeat: 0,
        ease,
        transformOrigin
      });
      if (this.isFromTween) {
        for (const animationElement of [...result.outerAnims, ...result.innerAnims]) {
          const fromAttribute = animationElement.getAttribute("from");
          const toAttribute = animationElement.getAttribute("to");
          if (fromAttribute !== null)
            animationElement.setAttribute("to", fromAttribute);
          if (toAttribute !== null)
            animationElement.setAttribute("from", toAttribute);
        }
      }
      for (const animationElement of [...result.outerAnims, ...result.innerAnims]) {
        const fromValue = animationElement.getAttribute("from") ?? "0";
        const toValue = animationElement.getAttribute("to") ?? "0";
        SMILTween.applyGroupPeriodEncoding(animationElement, fromValue, toValue, staggerOffset, groupPeriod, durationSeconds, delay, ease);
      }
      if (result.needsWrapper) {
        const scaffold = TransformComposer.buildPivotScaffold(target, result.origin.cx, result.origin.cy);
        if (scaffold) {
          SMILBuilder.injectInto(scaffold.outer, ...result.outerAnims);
          SMILBuilder.injectInto(scaffold.inner, ...result.innerAnims);
          this.pivotScaffolds.push({
            ...scaffold,
            parent: target.parentNode,
            nextSibling: target.nextSibling
          });
        } else {
          SMILBuilder.injectInto(target, ...result.outerAnims, ...result.innerAnims);
        }
      } else {
        SMILBuilder.injectInto(target, ...result.outerAnims);
      }
      this.animationElements.push(...result.outerAnims, ...result.innerAnims);
    }
    if (triggerBegin) {
      for (const animationElement of this.animationElements) {
        if (animationElement.tagName !== "animateTransform")
          continue;
        const existingBegin = animationElement.getAttribute("begin");
        animationElement.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
      }
    }
    this.durationSeconds = groupPeriod;
  };
  static applyGroupPeriodEncoding = (animationElement, fromValue, toValue, staggerOffset, groupPeriod, durationSeconds, delay, ease) => {
    const waitFraction = staggerOffset / groupPeriod;
    const animationEndFraction = (staggerOffset + durationSeconds) / groupPeriod;
    const hasWait = waitFraction > 0;
    const hasTail = animationEndFraction < 1;
    const valuesArray = [];
    const keyTimesArray = [];
    if (hasWait) {
      valuesArray.push(fromValue, fromValue);
      keyTimesArray.push(0, waitFraction);
    } else {
      valuesArray.push(fromValue);
      keyTimesArray.push(0);
    }
    valuesArray.push(toValue);
    keyTimesArray.push(animationEndFraction);
    if (hasTail) {
      valuesArray.push(toValue);
      keyTimesArray.push(1);
    }
    const valuesString = valuesArray.join(";");
    const keyTimesString = keyTimesArray.map((time) => Number(time.toFixed(6))).join(";");
    animationElement.removeAttribute("from");
    animationElement.removeAttribute("to");
    animationElement.setAttribute("values", valuesString);
    animationElement.setAttribute("keyTimes", keyTimesString);
    animationElement.setAttribute("dur", `${groupPeriod}s`);
    animationElement.setAttribute("repeatCount", "indefinite");
    animationElement.setAttribute("fill", "remove");
    if (animationElement.tagName === "animateTransform") {
      animationElement.setAttribute("additive", "replace");
    }
    if (delay > 0) {
      animationElement.setAttribute("begin", `${delay}s`);
    } else {
      animationElement.removeAttribute("begin");
    }
    const calcMode = Easing.resolveCalcMode(ease);
    animationElement.setAttribute("calcMode", calcMode);
    if (calcMode !== "spline")
      return;
    const bezier = ease ? Easing.resolveEase(ease) : null;
    const animationSpline = bezier ? bezier.join(" ") : "0 0 1 1";
    const holdSpline = "0 0 1 1";
    const keySplineSegments = [];
    if (hasWait)
      keySplineSegments.push(holdSpline);
    keySplineSegments.push(animationSpline);
    if (hasTail)
      keySplineSegments.push(holdSpline);
    animationElement.setAttribute("keySplines", keySplineSegments.join(";"));
  };
  static computeYoyoEncoding = (fromValue, toValue, totalPlays, durationSeconds, gsapRepeat) => {
    const isEven = totalPlays % 2 === 0;
    const isInfinite = gsapRepeat === -1;
    if (isInfinite) {
      return {
        values: `${fromValue}; ${toValue}; ${fromValue}`,
        dur: durationSeconds * 2,
        repeatCount: "indefinite"
      };
    }
    if (isEven) {
      return {
        values: `${fromValue}; ${toValue}; ${fromValue}`,
        dur: durationSeconds * 2,
        repeatCount: totalPlays / 2
      };
    }
    const sequenceLength = totalPlays + 1;
    const sequenceParts = [];
    for (let index = 0;index < sequenceLength; index++) {
      const isEvenPlay = index % 2 === 0;
      sequenceParts.push(isEvenPlay ? fromValue : toValue);
    }
    return {
      values: sequenceParts.join("; "),
      dur: durationSeconds * totalPlays,
      repeatCount: 1
    };
  };
  static applyStaggerPhasesToValues = (baseValues, fromValue, toValue, waitSeconds, tailHold, totalPlays) => {
    const isOddPlays = totalPlays % 2 !== 0;
    const holdValue = isOddPlays ? toValue : fromValue;
    const parts = baseValues.split("; ");
    const withWait = waitSeconds > 0 ? [fromValue, ...parts] : parts;
    const withHold = tailHold > 0 ? [...withWait, holdValue] : withWait;
    return withHold.join("; ");
  };
  static applyYoyoEasing = (element, ease, values) => {
    if (!ease || ease === "linear" || ease === "none")
      return;
    const bezier = Easing.resolveEase(ease);
    if (!bezier)
      return;
    const forwardBezier = bezier.join(" ");
    const [x1, y1, x2, y2] = bezier;
    const reversedBezier = `${1 - x2} ${1 - y2} ${1 - x1} ${1 - y1}`;
    const intervalCount = values.split(";").length - 1;
    const splines = [];
    for (let index = 0;index < intervalCount; index++) {
      splines.push(index % 2 === 0 ? forwardBezier : reversedBezier);
    }
    element.setAttribute("keySplines", splines.join("; "));
  };
  buildAttrElements = (target, attrs, fromAttrs, delay, timing, triggerBegin) => {
    const { ease } = timing;
    for (const [attributeName, value] of Object.entries(attrs)) {
      if (value === undefined || value === null)
        continue;
      const animationOptions = {
        attributeName,
        dur: this.durationSeconds,
        delay,
        repeat: this.repeatCount,
        ease
      };
      if (fromAttrs) {
        const fromValue = fromAttrs[attributeName];
        if (fromValue !== undefined && fromValue !== null) {
          animationOptions.from = String(fromValue);
        }
      }
      animationOptions.to = String(value);
      const element = SMILBuilder.animate(animationOptions);
      if (triggerBegin) {
        const existingBegin = element.getAttribute("begin");
        element.setAttribute("begin", existingBegin ? `${existingBegin}; ${triggerBegin}` : triggerBegin);
      }
      SMILBuilder.injectInto(target, element);
      this.animationElements.push(element);
    }
  };
  buildDirectProperties = (target, buckets, fromBuckets, delay, timing, triggerBegin) => {
    const { ease } = timing;
    for (const [attributeName, value] of Object.entries(buckets.direct)) {
      if (value === undefined)
        continue;
      const animationOptions = {
        attributeName,
        dur: this.durationSeconds,
        delay,
        repeat: this.repeatCount,
        ease
      };
      if (this.isFromTween) {
        animationOptions.from = String(value);
      } else if (fromBuckets) {
        const fromValue = fromBuckets.direct[attributeName];
        if (fromValue !== undefined) {
          animationOptions.from = String(fromValue);
        }
        animationOptions.to = String(value);
      } else {
        animationOptions.to = String(value);
      }
      const element = SMILBuilder.animate(animationOptions);
      this.injectAnimationElement(target, element, triggerBegin);
    }
  };
  buildTransformElements = (target, toTransforms, fromTransforms, delay, transformOrigin, timing, invertDirection = false, triggerBegin = null) => {
    const { ease } = timing;
    const result = TransformComposer.compose({
      toTransforms,
      fromTransforms,
      target,
      dur: this.durationSeconds,
      delay,
      repeat: this.repeatCount,
      ease,
      transformOrigin
    });
    if (invertDirection) {
      for (const element of [...result.outerAnims, ...result.innerAnims]) {
        const from = element.getAttribute("from");
        const to = element.getAttribute("to");
        if (from !== null)
          element.setAttribute("to", from);
        if (to !== null)
          element.setAttribute("from", to);
      }
    }
    const allAnims = [...result.outerAnims, ...result.innerAnims];
    if (triggerBegin) {
      for (const element of allAnims) {
        const existingBegin = element.getAttribute("begin");
        element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
      }
    }
    if (result.needsWrapper) {
      const scaffold = TransformComposer.buildPivotScaffold(target, result.origin.cx, result.origin.cy);
      if (scaffold) {
        SMILBuilder.injectInto(scaffold.outer, ...result.outerAnims);
        SMILBuilder.injectInto(scaffold.inner, ...result.innerAnims);
        this.pivotScaffolds.push({
          ...scaffold,
          parent: target.parentNode,
          nextSibling: target.nextSibling
        });
      } else {
        SMILBuilder.injectInto(target, ...allAnims);
      }
    } else {
      SMILBuilder.injectInto(target, ...result.outerAnims);
    }
    this.animationElements.push(...allAnims);
  };
  injectAnimationElement = (target, element, triggerBegin) => {
    if (triggerBegin) {
      const existingBegin = element.getAttribute("begin");
      element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
    }
    SMILBuilder.injectInto(target, element);
    this.animationElements.push(element);
  };
  kill = () => {
    if (!this.hasBuilt)
      return this;
    for (const scaffold of this.pivotScaffolds) {
      const pivotOut = scaffold.inner.firstElementChild;
      if (pivotOut) {
        const originalElement = pivotOut.firstElementChild;
        if (originalElement && scaffold.parent) {
          scaffold.parent.insertBefore(originalElement, scaffold.nextSibling);
        }
      }
      scaffold.outer.remove();
    }
    this.pivotScaffolds.length = 0;
    for (const element of this.animationElements) {
      element.remove();
    }
    this.animationElements.length = 0;
    this.hasBuilt = false;
    return this;
  };
  revert = () => {
    for (const [target, attributeMap] of this.originalAttributes) {
      for (const [attributeName, originalValue] of attributeMap) {
        if (originalValue === null) {
          target.removeAttribute(attributeName);
        } else {
          target.setAttribute(attributeName, originalValue);
        }
      }
    }
    return this.kill();
  };
}

// src/core/SMILTimeline.ts
var TRANSFORM_KEY_SET = new Set([
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
  "skewY"
]);

class SMILTimeline extends Animation {
  children = [];
  defaults;
  labels = {};
  timelineTrigger = null;
  lastChildStart = 0;
  lastChildEnd = 0;
  transformPhases = [];
  builtTransformElements = [];
  builtPivotScaffolds = [];
  constructor(timelineVars) {
    super(timelineVars ?? {});
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.defaults = timelineVars?.defaults ?? {};
  }
  to = (targetParam, toVars, position) => {
    const mergedVars = { ...this.defaults, ...toVars, delay: 0 };
    const { trigger } = mergedVars;
    const targets = SMILTimeline.resolveTargets(targetParam);
    if (trigger && !this.timelineTrigger && targets.length > 0) {
      this.timelineTrigger = TriggerResolver.resolve(targets[0], trigger);
    }
    const absoluteStart = this.resolvePosition(position);
    const buckets = PropertyRouter.route(mergedVars);
    const hasTransforms = Object.keys(buckets.transforms).length > 0;
    const hasNonTransforms = Object.keys(buckets.direct).length > 0 || Object.keys(buckets.attrs).length > 0;
    const tweenDurationSeconds = buckets.special.duration;
    const stepDurationSeconds = SMILTimeline.computeStepDuration(tweenDurationSeconds, mergedVars.stagger, targets.length);
    const childEnd = absoluteStart + stepDurationSeconds;
    if (hasNonTransforms) {
      const nonTransformVars = {
        ...SMILTimeline.stripTransformKeys(mergedVars),
        trigger: undefined
      };
      const tween = new SMILTween(targetParam, nonTransformVars);
      const entry = { tween, absoluteStart };
      this.children.push(entry);
      this.wireSequentialChains(entry);
      this.rewriteBegin(entry);
    }
    if (hasTransforms) {
      const { ease, stagger } = mergedVars;
      this.transformPhases.push({
        targets,
        transformVars: buckets.transforms,
        ease,
        absoluteStart,
        tweenDurationSeconds,
        stagger
      });
    }
    if (childEnd > this.durationSeconds) {
      this.durationSeconds = childEnd;
      this.totalDurationSeconds = childEnd;
    }
    this.lastChildStart = absoluteStart;
    this.lastChildEnd = childEnd;
    this.hasBuilt = true;
    return this;
  };
  add = (tween, position) => {
    const childEnd = position + tween.durationSeconds;
    const entry = { tween, absoluteStart: position };
    this.children.push(entry);
    this.wireSequentialChains(entry);
    this.rewriteBegin(entry);
    if (childEnd > this.durationSeconds) {
      this.durationSeconds = childEnd;
      this.totalDurationSeconds = childEnd;
    }
    this.lastChildStart = position;
    this.lastChildEnd = childEnd;
    return this;
  };
  addLabel = (name) => {
    this.labels[name] = this.durationSeconds;
    return this;
  };
  removeLabel = (name) => {
    delete this.labels[name];
    return this;
  };
  getChildren = () => this.children.map((entry) => entry.tween);
  build = () => {
    if (this.transformPhases.length === 0)
      return this;
    const phasesByTarget = new Map;
    for (const phase of this.transformPhases) {
      const staggerDelays = this.isAbsent(phase.stagger) || phase.targets.length <= 1 ? phase.targets.map(() => 0) : StaggerResolver.resolveDelays(phase.targets.length, phase.stagger);
      for (const [index, target] of phase.targets.entries()) {
        const staggerOffset = staggerDelays[index] ?? 0;
        const existingPhases = phasesByTarget.get(target) ?? [];
        existingPhases.push({
          effectiveStart: phase.absoluteStart + staggerOffset,
          tweenDurationSeconds: phase.tweenDurationSeconds,
          transformVars: phase.transformVars,
          ease: phase.ease
        });
        phasesByTarget.set(target, existingPhases);
      }
    }
    for (const [target, phases] of phasesByTarget) {
      const sortedPhases = [...phases].sort((phaseA, phaseB) => phaseA.effectiveStart - phaseB.effectiveStart);
      this.buildTransformsForTarget(target, sortedPhases);
    }
    return this;
  };
  clear = () => {
    for (const entry of this.children) {
      entry.tween.kill();
    }
    this.killBuiltTransforms();
    this.children = [];
    this.transformPhases.length = 0;
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.lastChildStart = 0;
    this.lastChildEnd = 0;
    this.hasBuilt = false;
    return this;
  };
  kill = () => {
    for (const entry of this.children) {
      entry.tween.kill();
    }
    this.killBuiltTransforms();
    this.children = [];
    return this;
  };
  revert = () => {
    for (const entry of this.children) {
      entry.tween.revert();
    }
    this.killBuiltTransforms();
    this.children = [];
    return this;
  };
  resolvePosition = (position) => {
    if (this.isAbsent(position))
      return this.lastChildEnd;
    if (typeof position === "number")
      return Math.max(0, position);
    return this.resolveStringPosition(position);
  };
  resolveStringPosition = (position) => {
    if (position === ">")
      return this.lastChildEnd;
    if (position === "<")
      return this.lastChildStart;
    if (position.startsWith(">")) {
      const offset = parseFloat(position.slice(1));
      return Math.max(0, this.lastChildEnd + offset);
    }
    if (position.startsWith("<")) {
      const offset = parseFloat(position.slice(1));
      return Math.max(0, this.lastChildStart + offset);
    }
    if (position.startsWith("+=")) {
      const offset = parseFloat(position.slice(2));
      return Math.max(0, this.durationSeconds + offset);
    }
    if (position.startsWith("-=")) {
      const offset = parseFloat(position.slice(2));
      return Math.max(0, this.durationSeconds - offset);
    }
    const plusMatch = /^(.+)\+=(\d+\.?\d*)$/.exec(position);
    if (plusMatch) {
      const labelName = plusMatch[1];
      const labelOffset = parseFloat(plusMatch[2]);
      const labelTime = this.labels[labelName] ?? 0;
      return Math.max(0, labelTime + labelOffset);
    }
    const minusMatch = /^(.+)-=(\d+\.?\d*)$/.exec(position);
    if (minusMatch) {
      const labelName = minusMatch[1];
      const labelOffset = parseFloat(minusMatch[2]);
      const labelTime = this.labels[labelName] ?? 0;
      return Math.max(0, labelTime - labelOffset);
    }
    return this.labels[position] ?? 0;
  };
  computeBeginValue = (effectiveBegin) => {
    if (this.timelineTrigger && effectiveBegin === 0)
      return this.timelineTrigger;
    if (this.timelineTrigger)
      return `${this.timelineTrigger} + ${effectiveBegin}s`;
    if (effectiveBegin === 0)
      return null;
    return `${effectiveBegin}s`;
  };
  rewriteBegin = (entry) => {
    const { tween, absoluteStart } = entry;
    for (const animationElement of tween.animationElements) {
      const perElementOffset = this.parseBeginOffset(animationElement);
      const effectiveBegin = absoluteStart + this.delaySeconds + perElementOffset;
      const beginValue = this.computeBeginValue(effectiveBegin);
      if (beginValue === null) {
        animationElement.removeAttribute("begin");
      } else {
        animationElement.setAttribute("begin", beginValue);
      }
    }
  };
  parseBeginOffset = (element) => {
    const begin = element.getAttribute("begin");
    if (!begin)
      return 0;
    const match = /^([\d.]+)s$/.exec(begin);
    if (!match)
      return 0;
    return parseFloat(match[1]);
  };
  wireSequentialChains = (newEntry) => {
    const { tween } = newEntry;
    for (const newAnimElement of tween.animationElements) {
      if (newAnimElement.nodeName === "animateTransform")
        continue;
      const targetElement = newAnimElement.parentElement;
      if (!targetElement)
        continue;
      const attributeName = newAnimElement.getAttribute("attributeName");
      if (!attributeName)
        continue;
      const precedingToValue = this.findPrecedingToValue(targetElement, attributeName);
      if (precedingToValue !== null) {
        newAnimElement.setAttribute("from", precedingToValue);
      }
    }
  };
  findPrecedingToValue = (targetElement, attributeName) => {
    for (let index = this.children.length - 2;index >= 0; index--) {
      const previousEntry = this.children[index];
      for (const previousAnimElement of previousEntry.tween.animationElements) {
        if (previousAnimElement.parentElement !== targetElement)
          continue;
        if (previousAnimElement.getAttribute("attributeName") !== attributeName)
          continue;
        return previousAnimElement.getAttribute("to");
      }
    }
    return null;
  };
  buildTransformsForTarget = (target, sortedPhases) => {
    const totalDuration = this.durationSeconds;
    const needsPivot = sortedPhases.some((phase) => !this.isAbsent(phase.transformVars.scale) || !this.isAbsent(phase.transformVars.scaleX) || !this.isAbsent(phase.transformVars.scaleY) || !this.isAbsent(phase.transformVars.skewX) || !this.isAbsent(phase.transformVars.skewY));
    const hasTranslate = sortedPhases.some((phase) => !this.isAbsent(phase.transformVars.x) || !this.isAbsent(phase.transformVars.y) || !this.isAbsent(phase.transformVars.xPercent) || !this.isAbsent(phase.transformVars.yPercent));
    const hasScale = sortedPhases.some((phase) => !this.isAbsent(phase.transformVars.scale) || !this.isAbsent(phase.transformVars.scaleX) || !this.isAbsent(phase.transformVars.scaleY));
    const hasRotation = sortedPhases.some((phase) => !this.isAbsent(phase.transformVars.rotation));
    const hasSkewX = sortedPhases.some((phase) => !this.isAbsent(phase.transformVars.skewX));
    const hasSkewY = sortedPhases.some((phase) => !this.isAbsent(phase.transformVars.skewY));
    const pivotOrigin = needsPivot || hasRotation ? SMILTimeline.computePivotOrigin(target) : { cx: 0, cy: 0 };
    const outerElements = [];
    const innerElements = [];
    if (hasTranslate) {
      outerElements.push(this.buildTranslateElement(sortedPhases, totalDuration));
    }
    if (hasRotation) {
      const rotationCenterX = needsPivot ? 0 : pivotOrigin.cx;
      const rotationCenterY = needsPivot ? 0 : pivotOrigin.cy;
      innerElements.push(this.buildRotateElement(sortedPhases, totalDuration, rotationCenterX, rotationCenterY));
    }
    if (hasScale) {
      innerElements.push(this.buildScaleElement(sortedPhases, totalDuration));
    }
    if (hasSkewX) {
      innerElements.push(this.buildSkewXElement(sortedPhases, totalDuration));
    }
    if (hasSkewY) {
      innerElements.push(this.buildSkewYElement(sortedPhases, totalDuration));
    }
    const allElements = [...outerElements, ...innerElements];
    this.applyRepeatAndTrigger(allElements);
    if (needsPivot && innerElements.length > 0) {
      const scaffold = TransformComposer.buildPivotScaffold(target, pivotOrigin.cx, pivotOrigin.cy);
      if (scaffold) {
        const { outer, inner } = scaffold;
        for (const element of outerElements)
          outer.appendChild(element);
        for (const element of innerElements)
          inner.appendChild(element);
        this.builtPivotScaffolds.push({ outer, target });
      } else {
        for (const element of allElements)
          target.appendChild(element);
      }
    } else {
      for (const element of allElements)
        target.appendChild(element);
    }
    this.builtTransformElements.push(...allElements);
  };
  static computePivotOrigin = (target) => {
    if (!(target instanceof SVGGraphicsElement))
      return { cx: 0, cy: 0 };
    const bbox = target.getBBox();
    return { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 };
  };
  applyRepeatAndTrigger = (elements) => {
    const repeatCountAttribute = this.repeatCount === -1 ? "indefinite" : String(Math.max(this.repeatCount + 1, 1));
    for (const element of elements) {
      element.setAttribute("repeatCount", repeatCountAttribute);
      if (this.timelineTrigger) {
        element.setAttribute("begin", this.timelineTrigger);
      }
    }
  };
  killBuiltTransforms = () => {
    for (const scaffoldEntry of this.builtPivotScaffolds) {
      const nextSibling = scaffoldEntry.outer.nextSibling;
      scaffoldEntry.outer.parentNode?.insertBefore(scaffoldEntry.target, nextSibling);
      scaffoldEntry.outer.remove();
    }
    for (const element of this.builtTransformElements) {
      element.remove();
    }
    this.builtTransformElements.length = 0;
    this.builtPivotScaffolds.length = 0;
  };
  buildTranslateElement = (sortedPhases, totalDuration) => {
    const translatePhases = sortedPhases.filter((phase) => !this.isAbsent(phase.transformVars.x) || !this.isAbsent(phase.transformVars.y) || !this.isAbsent(phase.transformVars.xPercent) || !this.isAbsent(phase.transformVars.yPercent));
    const boundaries = SMILTimeline.collectBoundaries(translatePhases, totalDuration);
    let currentX = 0;
    let currentY = 0;
    const valueStrings = [];
    const easePerInterval = [];
    for (let index = 0;index < boundaries.length; index++) {
      const boundaryTime = boundaries[index];
      for (const phase of translatePhases) {
        const phaseEnd = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          if (!this.isAbsent(phase.transformVars.x))
            currentX = Number(phase.transformVars.x);
          if (!this.isAbsent(phase.transformVars.y))
            currentY = Number(phase.transformVars.y);
          if (!this.isAbsent(phase.transformVars.xPercent))
            currentX = Number(phase.transformVars.xPercent);
          if (!this.isAbsent(phase.transformVars.yPercent))
            currentY = Number(phase.transformVars.yPercent);
        }
      }
      valueStrings.push(`${currentX} ${currentY}`);
      if (index < boundaries.length - 1) {
        easePerInterval.push(SMILTimeline.findActiveEase(translatePhases, boundaryTime, boundaries[index + 1]));
      }
    }
    return this.buildAnimateTransformElement("translate", { valueStrings, easePerInterval, boundaries }, totalDuration);
  };
  buildScaleElement = (sortedPhases, totalDuration) => {
    const scalePhases = sortedPhases.filter((phase) => !this.isAbsent(phase.transformVars.scale) || !this.isAbsent(phase.transformVars.scaleX) || !this.isAbsent(phase.transformVars.scaleY));
    const boundaries = SMILTimeline.collectBoundaries(scalePhases, totalDuration);
    let currentScaleX = 1;
    let currentScaleY = 1;
    const valueStrings = [];
    const easePerInterval = [];
    for (let index = 0;index < boundaries.length; index++) {
      const boundaryTime = boundaries[index];
      for (const phase of scalePhases) {
        const phaseEnd = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          if (!this.isAbsent(phase.transformVars.scale)) {
            currentScaleX = Number(phase.transformVars.scale);
            currentScaleY = Number(phase.transformVars.scale);
          }
          if (!this.isAbsent(phase.transformVars.scaleX))
            currentScaleX = Number(phase.transformVars.scaleX);
          if (!this.isAbsent(phase.transformVars.scaleY))
            currentScaleY = Number(phase.transformVars.scaleY);
        }
      }
      valueStrings.push(`${currentScaleX} ${currentScaleY}`);
      if (index < boundaries.length - 1) {
        easePerInterval.push(SMILTimeline.findActiveEase(scalePhases, boundaryTime, boundaries[index + 1]));
      }
    }
    return this.buildAnimateTransformElement("scale", { valueStrings, easePerInterval, boundaries }, totalDuration);
  };
  buildRotateElement = (sortedPhases, totalDuration, pivotCenterX, pivotCenterY) => {
    const rotatePhases = sortedPhases.filter((phase) => !this.isAbsent(phase.transformVars.rotation));
    const boundaries = SMILTimeline.collectBoundaries(rotatePhases, totalDuration);
    let currentRotation = 0;
    const valueStrings = [];
    const easePerInterval = [];
    for (let index = 0;index < boundaries.length; index++) {
      const boundaryTime = boundaries[index];
      for (const phase of rotatePhases) {
        const phaseEnd = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          currentRotation = Number(phase.transformVars.rotation);
        }
      }
      valueStrings.push(`${currentRotation} ${pivotCenterX} ${pivotCenterY}`);
      if (index < boundaries.length - 1) {
        easePerInterval.push(SMILTimeline.findActiveEase(rotatePhases, boundaryTime, boundaries[index + 1]));
      }
    }
    return this.buildAnimateTransformElement("rotate", { valueStrings, easePerInterval, boundaries }, totalDuration);
  };
  buildSkewXElement = (sortedPhases, totalDuration) => {
    const skewXPhases = sortedPhases.filter((phase) => !this.isAbsent(phase.transformVars.skewX));
    const boundaries = SMILTimeline.collectBoundaries(skewXPhases, totalDuration);
    let currentSkewX = 0;
    const valueStrings = [];
    const easePerInterval = [];
    for (let index = 0;index < boundaries.length; index++) {
      const boundaryTime = boundaries[index];
      for (const phase of skewXPhases) {
        const phaseEnd = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          currentSkewX = Number(phase.transformVars.skewX);
        }
      }
      valueStrings.push(String(currentSkewX));
      if (index < boundaries.length - 1) {
        easePerInterval.push(SMILTimeline.findActiveEase(skewXPhases, boundaryTime, boundaries[index + 1]));
      }
    }
    return this.buildAnimateTransformElement("skewX", { valueStrings, easePerInterval, boundaries }, totalDuration);
  };
  buildSkewYElement = (sortedPhases, totalDuration) => {
    const skewYPhases = sortedPhases.filter((phase) => !this.isAbsent(phase.transformVars.skewY));
    const boundaries = SMILTimeline.collectBoundaries(skewYPhases, totalDuration);
    let currentSkewY = 0;
    const valueStrings = [];
    const easePerInterval = [];
    for (let index = 0;index < boundaries.length; index++) {
      const boundaryTime = boundaries[index];
      for (const phase of skewYPhases) {
        const phaseEnd = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          currentSkewY = Number(phase.transformVars.skewY);
        }
      }
      valueStrings.push(String(currentSkewY));
      if (index < boundaries.length - 1) {
        easePerInterval.push(SMILTimeline.findActiveEase(skewYPhases, boundaryTime, boundaries[index + 1]));
      }
    }
    return this.buildAnimateTransformElement("skewY", { valueStrings, easePerInterval, boundaries }, totalDuration);
  };
  buildAnimateTransformElement = (type, keyframeSequence, totalDuration) => {
    const { valueStrings, easePerInterval, boundaries } = keyframeSequence;
    const element = document.createElementNS(SMILBuilder.SVG_NS, "animateTransform");
    element.setAttribute("attributeName", "transform");
    element.setAttribute("attributeType", "XML");
    element.setAttribute("type", type);
    element.setAttribute("additive", "sum");
    element.setAttribute("fill", "freeze");
    element.setAttribute("dur", `${totalDuration}s`);
    element.setAttribute("values", valueStrings.join(";"));
    const keyTimesString = boundaries.map((boundaryTime) => parseFloat((boundaryTime / totalDuration).toFixed(6)).toString()).join(";");
    element.setAttribute("keyTimes", keyTimesString);
    const hasSplineInterval = easePerInterval.some((ease) => {
      if (this.isAbsent(ease))
        return false;
      return Easing.resolveCalcMode(ease) === "spline";
    });
    if (hasSplineInterval) {
      element.setAttribute("calcMode", "spline");
      const holdSpline = "0 0 1 1";
      const keySplinesString = easePerInterval.map((ease) => {
        if (this.isAbsent(ease))
          return holdSpline;
        const bezier = Easing.resolveEase(ease);
        return bezier ? bezier.join(" ") : holdSpline;
      }).join(";");
      element.setAttribute("keySplines", keySplinesString);
    } else {
      element.setAttribute("calcMode", "linear");
    }
    return element;
  };
  static collectBoundaries = (phases, totalDuration) => {
    const boundarySet = new Set([0, totalDuration]);
    for (const phase of phases) {
      boundarySet.add(phase.effectiveStart);
      boundarySet.add(phase.effectiveStart + phase.tweenDurationSeconds);
    }
    return Array.from(boundarySet).sort((a, b) => a - b);
  };
  static findActiveEase = (phases, intervalStart, intervalEnd) => {
    const activePhase = phases.find((phase) => phase.effectiveStart <= intervalStart + 0.00001 && phase.effectiveStart + phase.tweenDurationSeconds >= intervalEnd - 0.00001);
    return activePhase?.ease ?? null;
  };
  static computeStepDuration = (tweenDurationSeconds, stagger, targetCount) => {
    if (!stagger || targetCount <= 1)
      return tweenDurationSeconds;
    const staggerDelays = StaggerResolver.resolveDelays(targetCount, stagger);
    const maxStaggerDelay = Math.max(...staggerDelays, 0);
    return maxStaggerDelay + tweenDurationSeconds;
  };
  static stripTransformKeys = (vars) => {
    const result = {};
    for (const [key, value] of Object.entries(vars)) {
      if (!TRANSFORM_KEY_SET.has(key)) {
        result[key] = value;
      }
    }
    return result;
  };
  static resolveTargets = (targetParam) => {
    if (typeof targetParam === "string") {
      return Array.from(document.querySelectorAll(targetParam));
    }
    if (targetParam instanceof NodeList) {
      return Array.from(targetParam);
    }
    if (Array.isArray(targetParam))
      return targetParam;
    return [targetParam];
  };
}

// src/index.ts
var smil = {
  to: (targets, vars) => new SMILTween(targets, vars),
  from: (targets, vars) => new SMILTween(targets, vars, null, true),
  fromTo: (targets, fromVars, toVars) => new SMILTween(targets, toVars, fromVars),
  set: (targets, vars) => new SMILTween(targets, { ...vars, duration: 0, ease: "none" }),
  timeline: (vars) => new SMILTimeline(vars)
};
var src_default = smil;
export {
  src_default as default,
  SMILTween,
  SMILTimeline,
  Easing,
  Animation
};

// src/core/Animation.ts
var _idCounter = 0;

class Animation {
  id;
  _delay;
  _repeat;
  _rDelay;
  _yoyo;
  _ts;
  _dur;
  _tDur;
  _start;
  _paused;
  _reversed;
  _initialized;
  data;
  parent;
  _calcTotalDuration = () => {
    if (this._repeat === -1)
      return Infinity;
    const playCount = this._repeat + 1;
    const gapTime = this._rDelay * this._repeat;
    return this._dur * playCount + gapTime;
  };
  constructor(vars) {
    this.id = vars.id ?? `smil-${++_idCounter}`;
    this._delay = vars.delay ?? 0;
    this._repeat = vars.repeat ?? 0;
    this._rDelay = vars.repeatDelay ?? 0;
    this._yoyo = vars.yoyo ?? false;
    this._ts = 1;
    this._dur = vars.duration ?? 0.5;
    this._start = 0;
    this._paused = vars.paused ?? false;
    this._reversed = vars.reversed ?? false;
    this._initialized = false;
    this.data = vars.data ?? null;
    this.parent = null;
    this._tDur = this._calcTotalDuration();
  }
  duration = (value) => {
    if (value === undefined)
      return this._dur;
    this._dur = value;
    this._tDur = this._calcTotalDuration();
    return this;
  };
  totalDuration = (value) => {
    if (value === undefined)
      return this._tDur;
    if (this._repeat > 0) {
      const plays = this._repeat + 1;
      const gapTime = this._rDelay * this._repeat;
      this._dur = (value - gapTime) / plays;
    } else {
      this._dur = value;
    }
    this._tDur = value;
    return this;
  };
  delay = (value) => {
    if (value === undefined)
      return this._delay;
    this._delay = value;
    return this;
  };
  repeat = (value) => {
    if (value === undefined)
      return this._repeat;
    this._repeat = value;
    this._tDur = this._calcTotalDuration();
    return this;
  };
  repeatDelay = (value) => {
    if (value === undefined)
      return this._rDelay;
    this._rDelay = value;
    this._tDur = this._calcTotalDuration();
    return this;
  };
  yoyo = (value) => {
    if (value === undefined)
      return this._yoyo;
    this._yoyo = value;
    return this;
  };
  timeScale = (value) => {
    if (value === undefined)
      return this._ts;
    this._ts = value;
    return this;
  };
  paused = (value) => {
    if (value === undefined)
      return this._paused;
    this._paused = value;
    return this;
  };
  reversed = (value) => {
    if (value === undefined)
      return this._reversed;
    this._reversed = value;
    return this;
  };
  isActive = () => this._initialized && !this._paused;
  invalidate = () => {
    this._initialized = false;
    return this;
  };
  then = (onFulfilled) => {
    const totalMs = (this._tDur === Infinity ? 0 : this._tDur + this._delay) * 1000;
    return new Promise((resolve) => {
      setTimeout(() => {
        onFulfilled?.(this);
        resolve(this);
      }, totalMs);
    });
  };
}

// src/utils/property-router.ts
var SPECIAL_KEYS = new Set([
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
  "onReverseCompleteParams"
]);
var TRANSFORM_KEYS = new Set([
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
var DIRECT_KEYS = new Set([
  "opacity",
  "fill",
  "stroke",
  "fillOpacity",
  "strokeOpacity",
  "strokeWidth",
  "strokeDashoffset",
  "strokeDasharray"
]);
var PLUGIN_KEYS = new Set(["drawSVG", "motionPath", "morphSVG"]);
var SPECIAL_DEFAULTS = {
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
var routeProperties = (vars) => {
  const transforms = {};
  const direct = {};
  const attrs = structuredClone(vars.attr) || {};
  const special = { ...SPECIAL_DEFAULTS };
  const plugins = {};
  for (const [key, value] of Object.entries(vars)) {
    if (key === "attr")
      continue;
    if (SPECIAL_KEYS.has(key)) {
      special[key] = value;
      continue;
    }
    if (TRANSFORM_KEYS.has(key)) {
      transforms[key] = value;
      continue;
    }
    if (DIRECT_KEYS.has(key)) {
      direct[key] = value;
      continue;
    }
    if (PLUGIN_KEYS.has(key)) {
      plugins[key] = value;
      continue;
    }
    direct[key] = value;
  }
  return { transforms, direct, attrs, special, plugins };
};

// src/utils/easing.ts
var EASE_MAP = new Map(Object.entries({
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
  "power1.in": [0.55, 0.085, 0.68, 0.53],
  "power1.out": [0.25, 0.46, 0.45, 0.94],
  "power1.inOut": [0.455, 0.03, 0.515, 0.955],
  "power2.in": [0.55, 0, 1, 0.45],
  "power2.out": [0, 0.55, 0.45, 1],
  "power2.inOut": [0.65, 0, 0.35, 1],
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
  "expo.inOut": [1, 0, 0, 1],
  "back.in": [0.6, -0.28, 0.735, 0.045],
  "back.out": [0.175, 0.885, 0.32, 1.275],
  "back.inOut": [0.68, -0.55, 0.265, 1.55]
}));
function resolveEase(ease) {
  if (Array.isArray(ease)) {
    if (ease.length !== 4) {
      throw new Error(`[gsap-to-smil] cubic-bezier array must have exactly 4 values, got ${ease.length}`);
    }
    return ease;
  }
  if (ease === "none" || ease === "linear")
    return null;
  const normalized = ease.replace(/\(.*\)$/, "");
  if (normalized.startsWith("elastic") || normalized.startsWith("bounce")) {
    return null;
  }
  const bezier = EASE_MAP.get(normalized);
  if (!bezier) {
    throw new Error(`[gsap-to-smil] Unknown ease "${ease}". Use a named GSAP ease, "linear", or a [x1,y1,x2,y2] array.`);
  }
  return bezier;
}
function getSvgUniformKeyTimes(keyTimesAmount) {
  const keyTimesArray = [0];
  const splinesAmount = keyTimesAmount - 1;
  const increment = 1 / splinesAmount;
  for (let i = 0;i < splinesAmount; i++) {
    const currentInterpolatedValue = keyTimesArray.at(-1) + increment;
    keyTimesArray.push(currentInterpolatedValue);
  }
  return keyTimesArray.join("; ");
}
function resolveCalcMode(ease, intervalCount) {
  if (!ease || ease === "none" || ease === "linear") {
    return { calcMode: "linear", keySplines: null, keyTimes: null };
  }
  const bezier = resolveEase(ease);
  if (!bezier) {
    console.warn(`[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`);
    return { calcMode: "linear", keySplines: null, keyTimes: null };
  }
  const stringBezier = bezier.join(" ");
  const keySplines = Array.from({ length: intervalCount }, () => stringBezier).join("; ");
  const keyTimes = getSvgUniformKeyTimes(intervalCount + 1);
  return { calcMode: "spline", keySplines, keyTimes };
}

// src/utils/builders.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var applyEasing = (el, ease, intervalCount) => {
  const { calcMode, keySplines, keyTimes } = resolveCalcMode(ease, intervalCount);
  el.setAttribute("calcMode", calcMode);
  if (keyTimes)
    el.setAttribute("keyTimes", keyTimes);
  if (keySplines)
    el.setAttribute("keySplines", keySplines);
};
var applyTiming = (el, opts) => {
  el.setAttribute("dur", `${opts.dur}s`);
  el.setAttribute("fill", opts.fill ?? "freeze");
  if (opts.delay) {
    el.setAttribute("begin", `${opts.delay}s`);
  }
  if (opts.repeat !== undefined && opts?.repeat !== 0) {
    el.setAttribute("repeatCount", opts.repeat === -1 ? "indefinite" : String(opts.repeat + 1));
  }
};
var applyValues = (el, opts) => {
  if (opts.values !== undefined) {
    el.setAttribute("values", opts.values);
    const intervalCount = opts.values.split(";").length - 1;
    applyEasing(el, opts.ease, intervalCount);
  } else {
    if (opts.from !== undefined)
      el.setAttribute("from", opts.from);
    if (opts.to !== undefined)
      el.setAttribute("to", opts.to);
    applyEasing(el, opts.ease, 1);
  }
};
var buildAnimate = (opts) => {
  const el = document.createElementNS(SVG_NS, "animate");
  el.setAttribute("attributeName", opts.attributeName);
  applyValues(el, opts);
  applyTiming(el, opts);
  if (opts.additive)
    el.setAttribute("additive", opts.additive);
  return el;
};
var buildAnimateTransform = (opts) => {
  const el = document.createElementNS(SVG_NS, "animateTransform");
  el.setAttribute("attributeName", "transform");
  el.setAttribute("attributeType", "XML");
  el.setAttribute("type", opts.type);
  el.setAttribute("additive", opts.additive ?? "sum");
  applyValues(el, opts);
  applyTiming(el, opts);
  return el;
};
var injectInto = (target, ...animations) => {
  for (const anim of animations) {
    target.appendChild(anim);
  }
};

// src/utils/transform-composer.ts
var resolveRotationOrigin = (el, transformOrigin) => {
  if (transformOrigin) {
    return parseTransformOrigin(el, transformOrigin);
  }
  return getBBoxCenter(el);
};
var parseTransformOrigin = (el, transformOrigin) => {
  const [rawX = "50%", rawY = rawX] = transformOrigin.trim().split(/\s+/);
  const resolve = (raw, dim) => {
    if (!raw.endsWith("%")) {
      return parseFloat(raw);
    }
    const pct = parseFloat(raw) / 100;
    if (!(el instanceof SVGGraphicsElement)) {
      return 0;
    }
    try {
      const bbox = el.getBBox();
      return bbox[dim === "width" ? "x" : "y"] + pct * bbox[dim];
    } catch {
      console.warn("[gsap-to-smil] Cannot determine rotation center — element not in rendered DOM. Falling back to 0.");
      return 0;
    }
  };
  return { cx: resolve(rawX, "width"), cy: resolve(rawY, "height") };
};
var getBBoxCenter = (el) => {
  if (!(el instanceof SVGGraphicsElement)) {
    console.warn("[gsap-to-smil] Cannot determine rotation center — element not in rendered DOM. Falling back to (0, 0).");
    return { cx: 0, cy: 0 };
  }
  try {
    const bbox = el.getBBox();
    return { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 };
  } catch {
    console.warn("[gsap-to-smil] Cannot determine rotation center — element not in rendered DOM. Falling back to (0, 0).");
    return { cx: 0, cy: 0 };
  }
};
var resolvePercent = (value, dim, el) => {
  if (typeof value !== "string" || !value.endsWith("%")) {
    return typeof value === "string" ? parseFloat(value) : value;
  }
  if (!(el instanceof SVGGraphicsElement)) {
    return 0;
  }
  try {
    const bbox = el.getBBox();
    return parseFloat(value) / 100 * bbox[dim];
  } catch {
    console.warn("[gsap-to-smil] Cannot determine percent value — element not in rendered DOM. Falling back to 0.");
    return 0;
  }
};
var translateStr = (x, y) => `${x} ${y}`;
var rotateStr = (angle, cx, cy) => `${angle} ${cx} ${cy}`;
var scaleStr = (sx, sy) => `${sx} ${sy}`;
var resolveTranslate = (from, to, target) => {
  if (!(("x" in to) || ("y" in to) || ("xPercent" in to) || ("yPercent" in to)))
    return null;
  const toX = to.xPercent !== undefined ? resolvePercent(to.xPercent, "width", target) : to.x ?? 0;
  const toY = to.yPercent !== undefined ? resolvePercent(to.yPercent, "height", target) : to.y ?? 0;
  const fromX = from.xPercent !== undefined ? resolvePercent(from.xPercent, "width", target) : from.x ?? 0;
  const fromY = from.yPercent !== undefined ? resolvePercent(from.yPercent, "height", target) : from.y ?? 0;
  return { type: "translate", from: translateStr(fromX, fromY), to: translateStr(toX, toY) };
};
var resolveRotate = (from, to, target, transformOrigin) => {
  if (!("rotation" in to))
    return null;
  const { cx, cy } = resolveRotationOrigin(target, transformOrigin);
  return {
    type: "rotate",
    from: rotateStr(from.rotation ?? 0, cx, cy),
    to: rotateStr(to.rotation ?? 0, cx, cy)
  };
};
var resolveScale = (from, to) => {
  if (!(("scale" in to) || ("scaleX" in to) || ("scaleY" in to)))
    return null;
  return {
    type: "scale",
    from: scaleStr(from.scale ?? from.scaleX ?? 1, from.scale ?? from.scaleY ?? 1),
    to: scaleStr(to.scale ?? to.scaleX ?? 1, to.scale ?? to.scaleY ?? 1)
  };
};
var resolveSkewX = (from, to) => {
  if (!("skewX" in to))
    return null;
  return { type: "skewX", from: String(from.skewX ?? 0), to: String(to.skewX ?? 0) };
};
var resolveSkewY = (from, to) => {
  if (!("skewY" in to))
    return null;
  return { type: "skewY", from: String(from.skewY ?? 0), to: String(to.skewY ?? 0) };
};
var composeTransforms = (opts) => {
  const { toTransforms: to, fromTransforms, target, transformOrigin } = opts;
  const from = fromTransforms ?? {};
  if ("rotationX" in to || "rotationY" in to) {
    console.warn("[gsap-to-smil] rotationX / rotationY have no SMIL equivalent — skipped.");
  }
  const sharedTiming = {
    dur: opts.dur,
    delay: opts.delay,
    repeat: opts.repeat,
    ease: opts.ease
  };
  const pairs = [
    resolveTranslate(from, to, target),
    resolveRotate(from, to, target, transformOrigin),
    resolveScale(from, to),
    resolveSkewX(from, to),
    resolveSkewY(from, to)
  ];
  return pairs.filter((pair) => pair !== null).map(({ type, from: from2, to: to2 }) => buildAnimateTransform({ type, from: from2, to: to2, additive: "sum", ...sharedTiming }));
};

// src/utils/stagger-resolver.ts
var resolveStep = (count, stagger) => {
  if (typeof stagger === "number")
    return stagger;
  if (stagger.each !== undefined)
    return stagger.each;
  if (stagger.amount !== undefined)
    return count <= 1 ? 0 : stagger.amount / (count - 1);
  return 0;
};
var randomOrder = (count) => {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1;i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
};
var resolveMultipliers = (count, from) => {
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
      return randomOrder(count);
    default:
      return Array.from({ length: count }, (_, i) => Math.abs(i - from));
  }
};
var resolveStaggerDelays = (count, stagger) => {
  if (count === 0)
    return [];
  const step = resolveStep(count, stagger);
  const from = typeof stagger === "object" ? stagger.from : undefined;
  const multipliers = resolveMultipliers(count, from);
  return multipliers.map((m) => m * step);
};

// src/utils/helpers/math.functions.ts
function roundToFloat(n, precision) {
  const power10 = 10 ** precision;
  return Math.round(n * power10) / power10;
}

// src/core/SMILTween.ts
class SMILTween extends Animation {
  _targets;
  _vars;
  _fromVars;
  _isFrom;
  _elements = [];
  _originalValues = new Map;
  constructor(targets, vars, fromVars, isFrom = false) {
    super(vars);
    this._vars = vars;
    this._fromVars = fromVars ?? null;
    this._isFrom = isFrom;
    this._targets = this._resolveTargets(targets);
    this._build();
  }
  _resolveTargets = (targets) => {
    if (typeof targets === "string") {
      return Array.from(document.querySelectorAll(targets));
    }
    if (targets instanceof Element) {
      return [targets];
    }
    if (targets instanceof NodeList) {
      return Array.from(targets);
    }
    if (Array.isArray(targets)) {
      return targets.flatMap((t) => typeof t === "string" ? Array.from(document.querySelectorAll(t)) : [t]);
    }
    return [];
  };
  _identityFor = (transforms) => {
    const identity = {};
    if ("x" in transforms || "xPercent" in transforms)
      identity.x = 0;
    if ("y" in transforms || "yPercent" in transforms)
      identity.y = 0;
    if ("rotation" in transforms)
      identity.rotation = 0;
    if ("scale" in transforms || "scaleX" in transforms || "scaleY" in transforms)
      identity.scale = 1;
    if ("skewX" in transforms)
      identity.skewX = 0;
    if ("skewY" in transforms)
      identity.skewY = 0;
    return identity;
  };
  _build = () => {
    if (this._yoyo) {
      console.warn("[gsap-to-smil] yoyo is not yet supported — ignored.");
    }
    const { transforms, direct } = routeProperties(this._vars);
    const fromRouted = this._fromVars ? routeProperties(this._fromVars) : null;
    const staggerDelays = this._vars.stagger ? resolveStaggerDelays(this._targets.length, this._vars.stagger) : null;
    const maxStagger = staggerDelays ? Math.max(...staggerDelays) : 0;
    const hasStaggerRepeat = staggerDelays !== null && this._repeat !== 0 && maxStagger > 0;
    const groupDuration = hasStaggerRepeat ? this._dur + maxStagger : this._dur;
    for (let i = 0;i < this._targets.length; i++) {
      const target = this._targets[i];
      const staggerOffset = staggerDelays?.[i] ?? 0;
      const beginDelay = this._delay + (hasStaggerRepeat ? 0 : staggerOffset);
      this._saveOriginals(target, transforms, direct);
      const elements = [
        ...this._buildTransforms(target, transforms, fromRouted?.transforms, beginDelay, groupDuration),
        ...this._buildDirect(direct, fromRouted?.direct, beginDelay, groupDuration)
      ];
      if (hasStaggerRepeat) {
        this._applyStaggerEncoding(elements, staggerOffset, groupDuration);
      }
      injectInto(target, ...elements);
      this._elements.push(...elements);
    }
    this._initialized = true;
  };
  _saveOriginals = (target, transforms, direct) => {
    const originals = {};
    if (Object.keys(transforms).length > 0) {
      originals["transform"] = target.getAttribute("transform");
    }
    for (const attr of Object.keys(direct)) {
      originals[attr] = target.getAttribute(attr);
    }
    this._originalValues.set(target, originals);
  };
  _buildTransforms = (target, transforms, fromTransforms, delay, dur) => {
    const timing = {
      dur,
      delay: delay || undefined,
      repeat: this._repeat,
      ease: this._vars.ease
    };
    if (this._isFrom) {
      return composeTransforms({
        target,
        fromTransforms: transforms,
        toTransforms: this._identityFor(transforms),
        transformOrigin: this._vars.transformOrigin,
        ...timing
      });
    }
    if (fromTransforms) {
      return composeTransforms({
        target,
        fromTransforms,
        toTransforms: transforms,
        transformOrigin: this._vars.transformOrigin,
        ...timing
      });
    }
    return composeTransforms({
      target,
      toTransforms: transforms,
      transformOrigin: this._vars.transformOrigin,
      ...timing
    });
  };
  _buildDirect = (direct, fromDirect, delay, dur) => {
    const elements = [];
    for (const [attr, value] of Object.entries(direct)) {
      if (value === undefined)
        continue;
      const shared = {
        attributeName: attr,
        dur,
        delay: delay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease
      };
      if (this._isFrom) {
        elements.push(buildAnimate({ ...shared, from: String(value) }));
      } else if (fromDirect) {
        const fromValue = fromDirect[attr];
        elements.push(buildAnimate({
          ...shared,
          from: fromValue !== undefined ? String(fromValue) : undefined,
          to: String(value)
        }));
      } else {
        elements.push(buildAnimate({ ...shared, to: String(value) }));
      }
    }
    return elements;
  };
  _applyStaggerEncoding = (elements, staggerOffset, groupDur) => {
    const S = staggerOffset;
    const D = this._dur;
    const G = groupDur;
    for (const el of elements) {
      const fromVal = el.getAttribute("from");
      const toVal = el.getAttribute("to");
      if (fromVal === null || toVal === null)
        continue;
      const hasWait = S > 0;
      const hasHold = S + D < G;
      const keyTimesArr = [0];
      const valuesArr = [fromVal];
      if (hasWait) {
        keyTimesArr.push(roundToFloat(S / G, 6));
        valuesArr.push(fromVal);
      }
      keyTimesArr.push(hasHold ? roundToFloat((S + D) / G, 6) : 1);
      valuesArr.push(toVal);
      if (hasHold) {
        keyTimesArr.push(1);
        valuesArr.push(toVal);
      }
      el.removeAttribute("from");
      el.removeAttribute("to");
      el.setAttribute("values", valuesArr.join("; "));
      el.setAttribute("keyTimes", keyTimesArr.join("; "));
      this._applyStaggerEasing(el, this._vars.ease, hasWait, hasHold);
    }
  };
  _applyStaggerEasing = (el, ease, hasWait, hasHold) => {
    if (!ease || ease === "none" || ease === "linear") {
      el.setAttribute("calcMode", "linear");
      el.removeAttribute("keySplines");
      return;
    }
    const bezier = resolveEase(ease);
    if (!bezier) {
      el.setAttribute("calcMode", "linear");
      el.removeAttribute("keySplines");
      return;
    }
    const animSpline = bezier.join(" ");
    const holdSpline = "0 0 1 1";
    const splines = [];
    if (hasWait)
      splines.push(holdSpline);
    splines.push(animSpline);
    if (hasHold)
      splines.push(holdSpline);
    el.setAttribute("calcMode", "spline");
    el.setAttribute("keySplines", splines.join("; "));
  };
  _svgOwner = () => this._elements[0]?.ownerSVGElement ?? null;
  play = () => {
    this._paused = false;
    for (const el of this._elements)
      el.beginElement();
    return this;
  };
  pause = () => {
    this._paused = true;
    this._svgOwner()?.pauseAnimations();
    return this;
  };
  resume = () => {
    this._paused = false;
    this._svgOwner()?.unpauseAnimations();
    return this;
  };
  seek = (time) => {
    this._svgOwner()?.setCurrentTime(time);
    return this;
  };
  restart = () => {
    for (const el of this._elements)
      el.beginElement();
    return this;
  };
  kill = () => {
    for (const el of this._elements)
      el.remove();
    this._elements = [];
    this._initialized = false;
    return this;
  };
  revert = () => {
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

// src/index.ts
var smil = {
  to: (targets, vars) => new SMILTween(targets, vars),
  from: (targets, vars) => new SMILTween(targets, vars, null, true),
  fromTo: (targets, fromVars, toVars) => new SMILTween(targets, toVars, fromVars),
  set: (targets, vars) => new SMILTween(targets, { ...vars, duration: 0, ease: "none" })
};
export {
  smil,
  SMILTween,
  Animation
};

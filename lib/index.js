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

// src/utils/transform-composer.ts
var resolveOrigin = (el, transformOrigin) => {
  if (transformOrigin)
    return parseTransformOrigin(el, transformOrigin);
  return getBBoxCenter(el);
};
var parseTransformOrigin = (el, transformOrigin) => {
  const [rawX = "50%", rawY = rawX] = transformOrigin.trim().split(/\s+/);
  const resolve = (raw, dim) => {
    if (!(el instanceof SVGGraphicsElement))
      return 0;
    let bbox;
    try {
      bbox = el.getBBox();
    } catch {
      console.warn("[gsap-to-smil] Cannot determine origin — element not in rendered DOM. Falling back to 0.");
      return 0;
    }
    const offset = dim === "width" ? bbox.x : bbox.y;
    if (raw.endsWith("%"))
      return offset + parseFloat(raw) / 100 * bbox[dim];
    return offset + parseFloat(raw);
  };
  return { cx: resolve(rawX, "width"), cy: resolve(rawY, "height") };
};
var getBBoxCenter = (el) => {
  if (!(el instanceof SVGGraphicsElement)) {
    console.warn("[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).");
    return { cx: 0, cy: 0 };
  }
  try {
    const bbox = el.getBBox();
    return { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 };
  } catch {
    console.warn("[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).");
    return { cx: 0, cy: 0 };
  }
};
var resolvePercent = (value, dim, el) => {
  if (typeof value !== "string" || !value.endsWith("%")) {
    return typeof value === "string" ? parseFloat(value) : value;
  }
  if (!(el instanceof SVGGraphicsElement))
    return 0;
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
  return {
    type: "translate",
    from: translateStr(fromX, fromY),
    to: translateStr(toX, toY)
  };
};
var resolveRotate = (from, to, cx, cy) => {
  if (!("rotation" in to))
    return null;
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
  return {
    type: "skewX",
    from: String(from.skewX ?? 0),
    to: String(to.skewX ?? 0)
  };
};
var resolveSkewY = (from, to) => {
  if (!("skewY" in to))
    return null;
  return {
    type: "skewY",
    from: String(from.skewY ?? 0),
    to: String(to.skewY ?? 0)
  };
};
var buildPivotScaffold = (el, cx, cy) => {
  const parent = el.parentNode;
  if (!parent) {
    console.warn("[gsap-to-smil] Cannot build pivot scaffold — element not in DOM. Scale/skew origin ignored.");
    return null;
  }
  const ns = "http://www.w3.org/2000/svg";
  const nextSibling = el.nextSibling;
  const outer = document.createElementNS(ns, "g");
  const pivotIn = document.createElementNS(ns, "g");
  const inner = document.createElementNS(ns, "g");
  const pivotOut = document.createElementNS(ns, "g");
  pivotIn.setAttribute("transform", `translate(${cx},${cy})`);
  pivotOut.setAttribute("transform", `translate(${-cx},${-cy})`);
  pivotOut.appendChild(el);
  inner.appendChild(pivotOut);
  pivotIn.appendChild(inner);
  outer.appendChild(pivotIn);
  parent.insertBefore(outer, nextSibling);
  return { outer, inner };
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
  const hasScale = "scale" in to || "scaleX" in to || "scaleY" in to;
  const hasSkew = "skewX" in to || "skewY" in to;
  const hasRotation = "rotation" in to;
  const needsWrapper = hasScale || hasSkew;
  const origin = needsWrapper || hasRotation ? resolveOrigin(target, transformOrigin) : { cx: 0, cy: 0 };
  const make = (pair) => buildAnimateTransform({
    type: pair.type,
    from: pair.from,
    to: pair.to,
    additive: "sum",
    ...sharedTiming
  });
  const translatePair = resolveTranslate(from, to, target);
  if (needsWrapper) {
    const rotatePair2 = hasRotation ? resolveRotate(from, to, 0, 0) : null;
    const innerPairs = [
      rotatePair2,
      resolveScale(from, to),
      resolveSkewX(from, to),
      resolveSkewY(from, to)
    ].filter((p) => p !== null);
    return {
      outerAnims: translatePair ? [make(translatePair)] : [],
      innerAnims: innerPairs.map(make),
      needsWrapper: true,
      origin
    };
  }
  const rotatePair = hasRotation ? resolveRotate(from, to, origin.cx, origin.cy) : null;
  return {
    outerAnims: [translatePair, rotatePair].filter((p) => p !== null).map(make),
    innerAnims: [],
    needsWrapper: false,
    origin
  };
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

// src/plugins/DrawSMILPlugin.ts
var parseDrawSVGValue = (val) => {
  if (val === true)
    return { start: 0, end: 1 };
  if (val === false || val === 0)
    return { start: 0, end: 0 };
  if (typeof val === "number") {
    return { start: 0, end: Math.max(0, Math.min(1, val)) };
  }
  const parts = String(val).trim().split(/\s+/);
  const parse = (s) => parseFloat(s) / (s.endsWith("%") ? 100 : 1);
  if (parts.length === 1) {
    return { start: 0, end: Math.max(0, Math.min(1, parse(parts[0]))) };
  }
  return {
    start: Math.max(0, Math.min(1, parse(parts[0]))),
    end: Math.max(0, Math.min(1, parse(parts[1])))
  };
};
var stateToAttrs = (s) => ({
  dasharray: `${Math.max(0, s.end - s.start)} 1`,
  dashoffset: s.start === 0 ? "0" : String(-s.start)
});
var applyDrawSVGState = (target, val) => {
  target.setAttribute("pathLength", "1");
  const state = parseDrawSVGValue(val);
  const attrs = stateToAttrs(state);
  target.setAttribute("stroke-dasharray", attrs.dasharray);
  target.setAttribute("stroke-dashoffset", attrs.dashoffset);
};
var buildDrawSVGAnimation = (target, toVal, fromVal, opts) => {
  target.setAttribute("pathLength", "1");
  const toState = parseDrawSVGValue(toVal);
  const fromState = (() => {
    if (fromVal !== undefined)
      return parseDrawSVGValue(fromVal);
    const da = target.getAttribute("stroke-dasharray");
    if (da !== null && da !== "none" && da !== "") {
      const dashLen = parseFloat(da);
      const dashoffset = parseFloat(target.getAttribute("stroke-dashoffset") ?? "0");
      const start = dashoffset < 0 ? -dashoffset : 0;
      return { start, end: Math.max(0, start + dashLen) };
    }
    return { start: 0, end: 1 };
  })();
  const from = stateToAttrs(fromState);
  const to = stateToAttrs(toState);
  return [
    buildAnimate({ attributeName: "stroke-dasharray", from: from.dasharray, to: to.dasharray, ...opts }),
    buildAnimate({ attributeName: "stroke-dashoffset", from: from.dashoffset, to: to.dashoffset, ...opts })
  ];
};

// src/utils/helpers/math.functions.ts
function roundToFloat(n, precision) {
  const power10 = 10 ** precision;
  return Math.round(n * power10) / power10;
}

// src/core/SMILTween.ts
var computeTransformDelta = (absolute, accum) => {
  const n = (v, fallback) => v !== undefined ? Number(v) : fallback;
  const delta = {};
  if ("x" in absolute)
    delta.x = n(absolute.x, 0) - accum.x;
  if ("y" in absolute)
    delta.y = n(absolute.y, 0) - accum.y;
  if ("rotation" in absolute)
    delta.rotation = n(absolute.rotation, 0) - accum.rotation;
  if ("scale" in absolute) {
    delta.scaleX = n(absolute.scale, 1) / accum.scaleX;
    delta.scaleY = n(absolute.scale, 1) / accum.scaleY;
  } else {
    if ("scaleX" in absolute)
      delta.scaleX = n(absolute.scaleX, 1) / accum.scaleX;
    if ("scaleY" in absolute)
      delta.scaleY = n(absolute.scaleY, 1) / accum.scaleY;
  }
  if ("skewX" in absolute)
    delta.skewX = n(absolute.skewX, 0) - accum.skewX;
  if ("skewY" in absolute)
    delta.skewY = n(absolute.skewY, 0) - accum.skewY;
  if ("xPercent" in absolute)
    delta.xPercent = absolute.xPercent;
  if ("yPercent" in absolute)
    delta.yPercent = absolute.yPercent;
  return delta;
};

class SMILTween extends Animation {
  _targets;
  _vars;
  _fromVars;
  _isFrom;
  _elements = [];
  _timelineAccum = null;
  _originalValues = new Map;
  _wrapperOuters = new Map;
  _pendingInjections = [];
  constructor(targets, vars, fromVars, isFrom = false, deferBuild = false) {
    super(vars);
    this._vars = vars;
    this._fromVars = fromVars ?? null;
    this._isFrom = isFrom;
    this._targets = this._resolveTargets(targets);
    if (!deferBuild)
      this._build();
  }
  _buildDeferred = () => {
    if (!this._initialized)
      this._build();
  };
  _injectPending = () => {
    for (const { anim, dest } of this._pendingInjections) {
      dest.appendChild(anim);
    }
    this._pendingInjections = [];
  };
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
    if (this._vars.keyframes !== undefined) {
      console.warn("[gsap-to-smil] keyframes are not yet supported — skipped.");
      return;
    }
    const { transforms, direct, plugins } = routeProperties(this._vars);
    const fromRouted = this._fromVars ? routeProperties(this._fromVars) : null;
    const staggerDelays = this._vars.stagger ? resolveStaggerDelays(this._targets.length, this._vars.stagger) : null;
    const maxStagger = staggerDelays ? Math.max(...staggerDelays) : 0;
    const hasStaggerRepeat = staggerDelays !== null && this._repeat !== 0 && maxStagger > 0;
    if (!hasStaggerRepeat && maxStagger > 0) {
      this._tDur = this._tDur === Infinity ? Infinity : this._tDur + maxStagger;
    }
    const totalPlays = this._repeat === -1 ? Infinity : this._repeat + 1;
    const yoyoGroupFactor = this._yoyo && hasStaggerRepeat ? this._repeat === -1 || totalPlays % 2 === 0 ? 2 : totalPlays : 1;
    const groupDuration = hasStaggerRepeat ? yoyoGroupFactor * this._dur + maxStagger : this._dur;
    for (let i = 0;i < this._targets.length; i++) {
      const target = this._targets[i];
      const staggerOffset = staggerDelays?.[i] ?? 0;
      const beginDelay = this._delay + (hasStaggerRepeat ? 0 : staggerOffset);
      this._saveOriginals(target, transforms, direct, plugins);
      const timingOpts = {
        dur: groupDuration,
        delay: beginDelay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease
      };
      const absoluteTo = this._isFrom ? this._identityFor(transforms) : transforms;
      const absoluteFrom = this._isFrom ? transforms : fromRouted?.transforms;
      const accum = this._timelineAccum?.get(target) ?? null;
      const effectiveTo = accum ? computeTransformDelta(absoluteTo, accum) : absoluteTo;
      const effectiveFrom = accum ? absoluteFrom ? computeTransformDelta(absoluteFrom, accum) : undefined : absoluteFrom;
      const { outerAnims, innerAnims, scaffold } = this._buildTransforms(target, effectiveTo, effectiveFrom, beginDelay, groupDuration);
      const directAnims = this._buildDirect(direct, fromRouted?.direct, beginDelay, groupDuration, this._yoyo ? this._originalValues.get(target) ?? undefined : undefined);
      const drawAnims = (() => {
        if (plugins.drawSVG === undefined)
          return [];
        if (this._dur === 0) {
          applyDrawSVGState(target, this._isFrom ? true : plugins.drawSVG);
          return [];
        }
        return buildDrawSVGAnimation(target, this._isFrom ? true : plugins.drawSVG, this._isFrom ? plugins.drawSVG : fromRouted?.plugins.drawSVG, timingOpts);
      })();
      const elements = [
        ...outerAnims,
        ...innerAnims,
        ...directAnims,
        ...drawAnims
      ];
      if (hasStaggerRepeat) {
        this._applyStaggerEncoding(elements, staggerOffset, groupDuration, this._yoyo);
      }
      if (this._timelineAccum) {
        if (scaffold) {
          for (const anim of outerAnims)
            this._pendingInjections.push({ anim, dest: scaffold.outer });
          for (const anim of innerAnims)
            this._pendingInjections.push({ anim, dest: scaffold.inner });
        } else {
          for (const anim of outerAnims)
            this._pendingInjections.push({ anim, dest: target });
        }
        for (const anim of directAnims)
          this._pendingInjections.push({ anim, dest: target });
        for (const anim of drawAnims)
          this._pendingInjections.push({ anim, dest: target });
      } else {
        if (scaffold) {
          for (const anim of outerAnims)
            scaffold.outer.appendChild(anim);
          for (const anim of innerAnims)
            scaffold.inner.appendChild(anim);
        } else {
          for (const anim of outerAnims)
            target.appendChild(anim);
        }
        for (const anim of directAnims)
          target.appendChild(anim);
        for (const anim of drawAnims)
          target.appendChild(anim);
      }
      this._elements.push(...elements);
    }
    if (this._yoyo && !hasStaggerRepeat) {
      this._applyYoyoEncoding(this._elements);
    }
    this._initialized = true;
  };
  _saveOriginals = (target, transforms, direct, plugins) => {
    const originals = {};
    if (Object.keys(transforms).length > 0) {
      originals["transform"] = target.getAttribute("transform");
    }
    for (const attr of Object.keys(direct)) {
      originals[attr] = target.getAttribute(attr);
    }
    if (plugins.drawSVG !== undefined) {
      originals["stroke-dasharray"] = target.getAttribute("stroke-dasharray");
      originals["stroke-dashoffset"] = target.getAttribute("stroke-dashoffset");
      originals["pathLength"] = target.getAttribute("pathLength");
    }
    this._originalValues.set(target, originals);
  };
  _buildTransforms = (target, toTransforms, fromTransforms, delay, dur) => {
    const timing = {
      dur,
      delay: delay || undefined,
      repeat: this._repeat,
      ease: this._vars.ease
    };
    const composeArgs = fromTransforms ? { target, fromTransforms, toTransforms, transformOrigin: this._vars.transformOrigin, ...timing } : { target, toTransforms, transformOrigin: this._vars.transformOrigin, ...timing };
    const result = composeTransforms(composeArgs);
    if (result.needsWrapper) {
      const scaffold = buildPivotScaffold(target, result.origin.cx, result.origin.cy);
      if (scaffold) {
        const existingTranslates = Array.from(target.children).filter((c) => c instanceof Element && c.tagName === "animateTransform" && c.getAttribute("type") === "translate");
        for (const anim of existingTranslates) {
          scaffold.outer.prepend(anim.cloneNode(true));
          anim.remove();
        }
        this._wrapperOuters.set(target, scaffold.outer);
        return { outerAnims: result.outerAnims, innerAnims: result.innerAnims, scaffold };
      }
      return {
        outerAnims: [...result.outerAnims, ...result.innerAnims],
        innerAnims: [],
        scaffold: null
      };
    }
    return { outerAnims: result.outerAnims, innerAnims: [], scaffold: null };
  };
  _buildDirect = (direct, fromDirect, delay, dur, originals) => {
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
      } else if (originals) {
        const origVal = originals[attr];
        elements.push(buildAnimate({
          ...shared,
          from: origVal != null ? origVal : undefined,
          to: String(value)
        }));
      } else {
        elements.push(buildAnimate({ ...shared, to: String(value) }));
      }
    }
    return elements;
  };
  _applyStaggerEncoding = (elements, staggerOffset, groupDur, yoyo = false) => {
    for (const el of elements) {
      const fromVal = el.getAttribute("from");
      const toVal = el.getAttribute("to");
      if (fromVal === null || toVal === null)
        continue;
      const hasWait = staggerOffset > 0;
      const animStartRatio = roundToFloat(staggerOffset / groupDur, 6);
      el.removeAttribute("from");
      el.removeAttribute("to");
      if (yoyo) {
        const totalPlays = this._repeat === -1 ? Infinity : this._repeat + 1;
        const isCleanCycle = this._repeat === -1 || totalPlays % 2 === 0;
        if (isCleanCycle) {
          const animMidRatio = roundToFloat((staggerOffset + this._dur) / groupDur, 6);
          const rawEnd = (staggerOffset + this._dur * 2) / groupDur;
          const hasHold = rawEnd < 1 - 0.000000001;
          const yoyoEndRatio = hasHold ? roundToFloat(rawEnd, 6) : 1;
          const valuesArr = [fromVal];
          const keyTimesArr = [0];
          if (hasWait) {
            valuesArr.push(fromVal);
            keyTimesArr.push(animStartRatio);
          }
          valuesArr.push(toVal);
          keyTimesArr.push(animMidRatio);
          valuesArr.push(fromVal);
          keyTimesArr.push(yoyoEndRatio);
          if (hasHold) {
            valuesArr.push(fromVal);
            keyTimesArr.push(1);
          }
          el.setAttribute("values", valuesArr.join("; "));
          el.setAttribute("keyTimes", keyTimesArr.join("; "));
          const rc = el.getAttribute("repeatCount");
          if (rc !== null && rc !== "indefinite") {
            el.setAttribute("repeatCount", String(parseInt(rc) / 2));
          }
          this._applyStaggerEasing(el, this._vars.ease, hasWait, hasHold, true);
        } else {
          const valuesArr = [fromVal];
          const keyTimesArr = [0];
          if (hasWait) {
            valuesArr.push(fromVal);
            keyTimesArr.push(animStartRatio);
          }
          for (let p = 1;p <= totalPlays; p++) {
            const raw = (staggerOffset + p * this._dur) / groupDur;
            keyTimesArr.push(roundToFloat(Math.min(raw, 1), 6));
            valuesArr.push(p % 2 === 0 ? fromVal : toVal);
          }
          const lastKT = keyTimesArr[keyTimesArr.length - 1];
          const hasHold = lastKT < 1;
          if (hasHold) {
            keyTimesArr.push(1);
            valuesArr.push(valuesArr[valuesArr.length - 1]);
          }
          el.setAttribute("values", valuesArr.join("; "));
          el.setAttribute("keyTimes", keyTimesArr.join("; "));
          el.setAttribute("repeatCount", "1");
          this._applyStaggerEasingFull(el, this._vars.ease, hasWait, hasHold, totalPlays);
        }
      } else {
        const hasHold = staggerOffset + this._dur < groupDur;
        const animEndRatio = hasHold ? roundToFloat((staggerOffset + this._dur) / groupDur, 6) : 1;
        const valuesArr = [fromVal];
        const keyTimesArr = [0];
        if (hasWait) {
          keyTimesArr.push(animStartRatio);
          valuesArr.push(fromVal);
        }
        keyTimesArr.push(animEndRatio);
        valuesArr.push(toVal);
        if (hasHold) {
          keyTimesArr.push(1);
          valuesArr.push(toVal);
        }
        el.setAttribute("values", valuesArr.join("; "));
        el.setAttribute("keyTimes", keyTimesArr.join("; "));
        this._applyStaggerEasing(el, this._vars.ease, hasWait, hasHold);
      }
    }
  };
  _applyStaggerEasing = (el, ease, hasWait, hasHold, hasYoyo = false) => {
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
    const [x1, y1, x2, y2] = bezier;
    const animSpline = bezier.join(" ");
    const holdSpline = "0 0 1 1";
    const splines = [];
    if (hasWait)
      splines.push(holdSpline);
    splines.push(animSpline);
    if (hasYoyo) {
      const revSpline = `${roundToFloat(1 - x2, 6)} ${roundToFloat(1 - y2, 6)} ${roundToFloat(1 - x1, 6)} ${roundToFloat(1 - y1, 6)}`;
      splines.push(revSpline);
    }
    if (hasHold)
      splines.push(holdSpline);
    el.setAttribute("calcMode", "spline");
    el.setAttribute("keySplines", splines.join("; "));
  };
  _applyStaggerEasingFull = (el, ease, hasWait, hasHold, totalPlays) => {
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
    const [x1, y1, x2, y2] = bezier;
    const fwdSpline = bezier.join(" ");
    const revSpline = `${roundToFloat(1 - x2, 6)} ${roundToFloat(1 - y2, 6)} ${roundToFloat(1 - x1, 6)} ${roundToFloat(1 - y1, 6)}`;
    const holdSpline = "0 0 1 1";
    const splines = [];
    if (hasWait)
      splines.push(holdSpline);
    for (let i = 0;i < totalPlays; i++)
      splines.push(i % 2 === 0 ? fwdSpline : revSpline);
    if (hasHold)
      splines.push(holdSpline);
    el.setAttribute("calcMode", "spline");
    el.setAttribute("keySplines", splines.join("; "));
  };
  _applyYoyoEncoding = (elements) => {
    const totalPlays = this._repeat === -1 ? Infinity : this._repeat + 1;
    if (totalPlays === 1)
      return;
    const ease = this._vars.ease;
    const bezier = ease && ease !== "none" && ease !== "linear" ? resolveEase(ease) : null;
    const makeSplines = (intervalCount) => {
      if (!bezier)
        return null;
      const [x1, y1, x2, y2] = bezier;
      const fwd = `${x1} ${y1} ${x2} ${y2}`;
      const rev = `${roundToFloat(1 - x2, 6)} ${roundToFloat(1 - y2, 6)} ${roundToFloat(1 - x1, 6)} ${roundToFloat(1 - y1, 6)}`;
      const splines = [];
      for (let i = 0;i < intervalCount; i++)
        splines.push(i % 2 === 0 ? fwd : rev);
      return splines.join("; ");
    };
    for (const el of elements) {
      const fromVal = el.getAttribute("from");
      const toVal = el.getAttribute("to");
      if (fromVal === null || toVal === null)
        continue;
      const durSec = parseFloat(el.getAttribute("dur"));
      el.removeAttribute("from");
      el.removeAttribute("to");
      if (totalPlays === Infinity || totalPlays % 2 === 0) {
        const repeatCount = totalPlays === Infinity ? "indefinite" : String(totalPlays / 2);
        el.setAttribute("values", `${fromVal}; ${toVal}; ${fromVal}`);
        el.setAttribute("keyTimes", "0; 0.5; 1");
        el.setAttribute("dur", `${durSec * 2}s`);
        el.setAttribute("repeatCount", repeatCount);
        const splines = makeSplines(2);
        if (splines) {
          el.setAttribute("calcMode", "spline");
          el.setAttribute("keySplines", splines);
        } else {
          el.setAttribute("calcMode", "linear");
          el.removeAttribute("keySplines");
        }
      } else {
        const valuesArr = Array.from({ length: totalPlays + 1 }, (_, i) => i % 2 === 0 ? fromVal : toVal);
        const keyTimesArr = Array.from({ length: totalPlays + 1 }, (_, i) => roundToFloat(i / totalPlays, 6));
        el.setAttribute("values", valuesArr.join("; "));
        el.setAttribute("keyTimes", keyTimesArr.join("; "));
        el.setAttribute("dur", `${durSec * totalPlays}s`);
        el.setAttribute("repeatCount", "1");
        const splines = makeSplines(totalPlays);
        if (splines) {
          el.setAttribute("calcMode", "spline");
          el.setAttribute("keySplines", splines);
        } else {
          el.setAttribute("calcMode", "linear");
          el.removeAttribute("keySplines");
        }
      }
    }
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
    for (const [el, outerGroup] of this._wrapperOuters) {
      const scaffoldParent = outerGroup.parentNode;
      if (scaffoldParent) {
        scaffoldParent.insertBefore(el, outerGroup);
        outerGroup.remove();
      }
    }
    this._wrapperOuters.clear();
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

// src/core/SMILTimeline.ts
var defaultAccum = () => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0
});

class SMILTimeline extends Animation {
  _children = [];
  _labels = {};
  _defaults;
  _prevStart = 0;
  _prevEnd = 0;
  _transformAccum = new Map;
  constructor(vars = {}) {
    super(vars);
    this._defaults = vars.defaults ?? {};
    this._dur = 0;
    this._tDur = 0;
  }
  _setContentDur(dur) {
    this._dur = dur;
    this._tDur = this._repeat === -1 ? Infinity : dur * (this._repeat + 1) + this._rDelay * this._repeat;
  }
  _resolvePosition = (position) => {
    if (position === undefined || position === ">")
      return this._prevEnd;
    if (typeof position === "number")
      return Math.max(0, position);
    const str = String(position);
    if (str in this._labels)
      return this._labels[str];
    if (str === "<")
      return this._prevStart;
    if (str.startsWith("<") && str.length > 1)
      return Math.max(0, this._prevStart + parseFloat(str.slice(1)));
    if (str.startsWith(">") && str.length > 1)
      return Math.max(0, this._prevEnd + parseFloat(str.slice(1)));
    if (str.startsWith("+="))
      return this._dur + parseFloat(str.slice(2));
    if (str.startsWith("-="))
      return Math.max(0, this._dur - parseFloat(str.slice(2)));
    const labelMatch = str.match(/^(.+?)([+\-]=)(\d+\.?\d*)$/);
    if (labelMatch) {
      const labelTime = this._labels[labelMatch[1]] ?? 0;
      const offset = parseFloat(labelMatch[3]);
      return labelMatch[2] === "+=" ? labelTime + offset : Math.max(0, labelTime - offset);
    }
    return this._prevEnd;
  };
  _rewriteBegin = (tween, absoluteStart) => {
    for (const el of tween._elements) {
      const current = el.getAttribute("begin");
      const localSec = current ? parseFloat(current) : 0;
      const newBegin = this._delay + absoluteStart + localSec;
      if (newBegin === 0) {
        el.removeAttribute("begin");
      } else {
        el.setAttribute("begin", `${newBegin}s`);
      }
    }
  };
  _updateTransformAccum = (tween) => {
    const { transforms } = routeProperties(tween._vars);
    for (const target of tween._targets) {
      const accum = { ...this._transformAccum.get(target) ?? defaultAccum() };
      const n = (v, fallback) => v !== undefined ? Number(v) : fallback;
      if (tween._isFrom) {
        if ("x" in transforms || "xPercent" in transforms)
          accum.x = 0;
        if ("y" in transforms || "yPercent" in transforms)
          accum.y = 0;
        if ("rotation" in transforms)
          accum.rotation = 0;
        if ("scale" in transforms || "scaleX" in transforms || "scaleY" in transforms) {
          accum.scaleX = 1;
          accum.scaleY = 1;
        }
        if ("skewX" in transforms)
          accum.skewX = 0;
        if ("skewY" in transforms)
          accum.skewY = 0;
      } else {
        if ("x" in transforms)
          accum.x = n(transforms.x, 0);
        if ("y" in transforms)
          accum.y = n(transforms.y, 0);
        if ("rotation" in transforms)
          accum.rotation = n(transforms.rotation, 0);
        if ("scale" in transforms) {
          accum.scaleX = n(transforms.scale, 1);
          accum.scaleY = n(transforms.scale, 1);
        }
        if ("scaleX" in transforms)
          accum.scaleX = n(transforms.scaleX, 1);
        if ("scaleY" in transforms)
          accum.scaleY = n(transforms.scaleY, 1);
        if ("skewX" in transforms)
          accum.skewX = n(transforms.skewX, 0);
        if ("skewY" in transforms)
          accum.skewY = n(transforms.skewY, 0);
      }
      this._transformAccum.set(target, accum);
    }
  };
  _addChild = (tween, absoluteStart) => {
    this._rewriteBegin(tween, absoluteStart);
    tween._injectPending();
    this._children.push({ tween, absoluteStart });
    this._prevStart = absoluteStart;
    const sequentialEnd = absoluteStart + (tween._tDur === Infinity ? tween._dur : tween._tDur);
    this._prevEnd = sequentialEnd;
    const contentEnd = absoluteStart + tween._delay + (tween._tDur === Infinity ? tween._dur : tween._tDur);
    if (contentEnd > this._dur)
      this._setContentDur(contentEnd);
    this._initialized = true;
  };
  to = (targets, vars, position) => {
    const absoluteStart = this._resolvePosition(position);
    const tween = new SMILTween(targets, { ...this._defaults, ...vars }, null, false, true);
    tween._timelineAccum = this._transformAccum;
    tween._buildDeferred();
    this._addChild(tween, absoluteStart);
    this._updateTransformAccum(tween);
    return this;
  };
  from = (targets, vars, position) => {
    const absoluteStart = this._resolvePosition(position);
    const tween = new SMILTween(targets, { ...this._defaults, ...vars }, null, true, true);
    tween._timelineAccum = this._transformAccum;
    tween._buildDeferred();
    this._addChild(tween, absoluteStart);
    this._updateTransformAccum(tween);
    return this;
  };
  fromTo = (targets, fromVars, toVars, position) => {
    const absoluteStart = this._resolvePosition(position);
    const tween = new SMILTween(targets, { ...this._defaults, ...toVars }, fromVars, false, true);
    tween._timelineAccum = this._transformAccum;
    tween._buildDeferred();
    this._addChild(tween, absoluteStart);
    this._updateTransformAccum(tween);
    return this;
  };
  set = (targets, vars, position) => this.to(targets, { ...vars, duration: 0, ease: "none" }, position);
  add = (child, position) => {
    const absoluteStart = this._resolvePosition(position);
    this._addChild(child, absoluteStart);
    return this;
  };
  addLabel = (label, position) => {
    this._labels[label] = this._resolvePosition(position);
    return this;
  };
  removeLabel = (label) => {
    delete this._labels[label];
    return this;
  };
  getChildren = () => this._children.map((c) => c.tween);
  clear = () => {
    for (const { tween } of this._children)
      tween.kill();
    this._children = [];
    this._labels = {};
    this._prevStart = 0;
    this._prevEnd = 0;
    this._transformAccum.clear();
    this._setContentDur(0);
    this._initialized = false;
    return this;
  };
  play = () => {
    this._paused = false;
    for (const { tween } of this._children)
      tween.play();
    return this;
  };
  pause = () => {
    this._paused = true;
    const firstEl = this._children[0]?.tween._elements[0];
    firstEl?.ownerSVGElement?.pauseAnimations();
    return this;
  };
  resume = () => {
    this._paused = false;
    const firstEl = this._children[0]?.tween._elements[0];
    firstEl?.ownerSVGElement?.unpauseAnimations();
    return this;
  };
  kill = () => {
    for (const { tween } of this._children)
      tween.kill();
    this._children = [];
    this._initialized = false;
    return this;
  };
  revert = () => {
    for (const { tween } of this._children)
      tween.revert();
    this._children = [];
    this._initialized = false;
    return this;
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
export {
  smil,
  SMILTween,
  SMILTimeline,
  Animation
};

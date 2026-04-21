type Test = "test" | "not-test";
const a: Test = "test";
console.log(a, 3);

/*
Interesting sources to read:

https://developer.mozilla.org/en-US/docs/Web/SVG/Element/textPath

https://css-tricks.com/guide-svg-animations-smil/#aa-controlling-animation-pace-with-custom-easing-calcmode-and-keysplines

https://oak.is/thinking/animated-svgs/

Tools:
https://tools.webdevpuneet.com/css-easing-generator/

https://cubic-bezier.com/

https://yqnn.github.io/svg-path-editor/
*/

function getSvgUniformKeyTimes(keyTimesAmount: number): string {
  const keyTimesArray: number[] = [0];

  const splinesAmount: number = keyTimesAmount - 1;
  const increment: number = 1 / splinesAmount;

  for (let i = 0; i < splinesAmount; i++) {
    const currentInterpolatedValue: number = keyTimesArray.at(-1) + increment;

    keyTimesArray.push(currentInterpolatedValue);
  }

  const keyTimesString = keyTimesArray.join("; ");
  return keyTimesString;
}

function getSvgKeySplines(
  timingAnimation: string,
  keyTimesAmount: number,
  cubicBezier?: number[],
) {
  if (typeof timingAnimation !== "string" && !Array.isArray(timingAnimation)) {
    throw new Error(
      "No ease function nor cubic bézier array was inputted, cannot generate keySpline without at least either one of them",
    );
  }

  if (!keyTimesAmount) {
    throw new Error(
      "The keyTimesAmount parameter has an invalid value, you must enter an integer for the keyTimesAmount",
    );
  }

  const easingTimingFunctionsMap = new Map<string, number[]>(
    Object.entries({
      "ease-in-out": [0.42, 0, 0.58, 1],
      ease: [0.25, 0.1, 0.25, 1],
      "ease-in": [0.42, 0, 1, 1],
      "ease-out": [0, 0, 0.58, 1],
    }),
  );

  const chosenEaseFunction: number[] =
    easingTimingFunctionsMap.get(timingAnimation) || cubicBezier;

  const easeFunctionsArray: string[] = [];
  const stringEaseFunction: string = chosenEaseFunction.join(" ");

  for (let i = 0; i < keyTimesAmount - 1; i++) {
    easeFunctionsArray.push(stringEaseFunction);
  }

  const keySplinesString = easeFunctionsArray.join("; ");

  return keySplinesString;
}

function getSvgTimingFunctionString(
  valuesAmount: number,
  cubicBezierCoordsArray: number[],
) {
  const keyTimes = getSvgUniformKeyTimes(valuesAmount);
  const keySplines = getSvgKeySplines(cubicBezierCoordsArray, valuesAmount);

  return `keyTimes="${keyTimes}" calcMode="spline" keySplines="${keySplines}"`;
}

console.log(getSvgTimingFunctionString(3, "ease-in-out"));

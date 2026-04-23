export function getSvgUniformKeyTimes(keyTimesAmount: number): string {
  const keyTimesArray: number[] = [0];

  const splinesAmount: number = keyTimesAmount - 1;
  const increment: number = 1 / splinesAmount;

  for (let i = 0; i < splinesAmount; i++) {
    const currentInterpolatedValue: number = keyTimesArray.at(-1)! + increment;
    keyTimesArray.push(currentInterpolatedValue);
  }

  return keyTimesArray.join("; ");
}

export function getSvgKeySplines(
  timingAnimation: string | number[],
  keyTimesAmount: number,
  cubicBezier?: number[],
): string {
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
    (typeof timingAnimation === "string"
      ? easingTimingFunctionsMap.get(timingAnimation)
      : timingAnimation) ?? cubicBezier!;

  const stringEaseFunction: string = chosenEaseFunction.join(" ");
  const easeFunctionsArray: string[] = [];

  for (let i = 0; i < keyTimesAmount - 1; i++) {
    easeFunctionsArray.push(stringEaseFunction);
  }

  return easeFunctionsArray.join("; ");
}

export function getSvgTimingFunctionString(
  valuesAmount: number,
  timingAnimation: string | number[],
): string {
  const keyTimes = getSvgUniformKeyTimes(valuesAmount);
  const keySplines = getSvgKeySplines(timingAnimation, valuesAmount);

  return `keyTimes="${keyTimes}" calcMode="spline" keySplines="${keySplines}"`;
}

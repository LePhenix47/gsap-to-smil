type EaseDirection = "in" | "out" | "inOut";
type PowerScale = 1 | 2 | 3 | 4;
type PowerFamily = `power${PowerScale}.${EaseDirection}`;
type SineFamily = `sine.${EaseDirection}`;
type CircFamily = `circ.${EaseDirection}`;
type ExpoFamily = `expo.${EaseDirection}`;
type BackFamily = `back.${EaseDirection}`;
type ElasticFamily = `elastic.${EaseDirection}`;
type BounceFamily = `bounce.${EaseDirection}`;

/**
 * Named GSAP ease string, CSS shorthand, or any custom/parametrized ease like `"back.out(1.7)"`.
 *
 * Named eases map to a cubic-bezier in `utils/easing.ts`.
 * `"elastic"` and `"bounce"` fall back to keyframe approximation (not a single bezier).
 * `"none"` / `"linear"` skip keySplines entirely and use `calcMode="linear"`.
 */
export type EaseString =
  | "none"
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | PowerFamily
  | SineFamily
  | CircFamily
  | ExpoFamily
  | BackFamily
  | ElasticFamily
  | BounceFamily
  | (string & {}); // keeps autocomplete while allowing "back.out(1.7)" and custom eases

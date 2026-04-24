type EaseDirection = "in" | "out" | "inOut";
type PowerScale = 1 | 2 | 3 | 4;
type PowerFamily = `power${PowerScale}.${EaseDirection}`;
type SineFamily = `sine.${EaseDirection}`;
type CircFamily = `circ.${EaseDirection}`;
type ExpoFamily = `expo.${EaseDirection}`;
type BackFamily = `back.${EaseDirection}`;
type ElasticFamily = `elastic.${EaseDirection}`;
type BounceFamily = `bounce.${EaseDirection}`;

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

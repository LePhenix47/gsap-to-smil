/**
 * Anything you can pass as a target to `smil.to()`, `smil.from()` etc.
 * Mirrors GSAP's target resolution: CSS selector, single element, or any collection of elements.
 */
export type TweenTarget =
  | string
  | Element
  | SVGElement
  | Element[]
  | SVGElement[]
  | NodeList
  | NodeListOf<Element>;

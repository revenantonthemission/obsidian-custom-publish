/**
 * Lucide icons (lucide-static 1.8.0, ISC) for the post page scripts, built
 * with DOM APIs instead of markup strings, so no script assigns innerHTML.
 * They are drawn at the 1.75 stroke of lib/icons.ts and are always
 * aria-hidden: every control carries its own Korean name (FR5.9).
 */
const SVG_NS = "http://www.w3.org/2000/svg";

export interface IconShape {
  readonly tag: "path" | "rect";
  readonly attributes: Readonly<Record<string, string>>;
}

export type Icon = readonly IconShape[];

export const ICON_COPY: Icon = [
  { tag: "rect", attributes: { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" } },
  { tag: "path", attributes: { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" } },
];

export const ICON_CHECK: Icon = [{ tag: "path", attributes: { d: "M20 6 9 17l-5-5" } }];

export const ICON_CHEVRON_RIGHT: Icon = [{ tag: "path", attributes: { d: "m9 18 6-6-6-6" } }];

const SVG_ATTRIBUTES: Readonly<Record<string, string>> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "1.75",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
  focusable: "false",
};

function setAttributes(element: Element, attributes: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
}

/** A decorative svg element for the icon, `size` CSS pixels square. */
export function svgIcon(icon: Icon, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  setAttributes(svg, { ...SVG_ATTRIBUTES, width: String(size), height: String(size) });
  for (const shape of icon) {
    const element = document.createElementNS(SVG_NS, shape.tag);
    setAttributes(element, shape.attributes);
    svg.append(element);
  }
  return svg;
}

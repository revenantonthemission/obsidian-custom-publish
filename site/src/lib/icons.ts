/**
 * Build-time Lucide icons as decorative inline SVG (FR5.9; design-system-mapping.md,
 * "Icons"). SF Symbols cannot be licensed for the web; Lucide drawn at a
 * 1.75 px stroke sits close to SF Symbols' regular weight. Every icon is hidden
 * from assistive technology: the control that holds it carries the name.
 */
export const ICON_STROKE = 1.75;

/** Sizes a lucide-static SVG string and marks it decorative. */
export function decorativeIcon(svg: string, size = 20): string {
  if (!svg.includes('<svg')) {
    throw new TypeError('decorativeIcon expects a lucide-static SVG string.');
  }
  return svg
    .trim()
    .replace(/\swidth="\d+"/, ` width="${size}"`)
    .replace(/\sheight="\d+"/, ` height="${size}"`)
    .replace(/\sstroke-width="[\d.]+"/, ` stroke-width="${ICON_STROKE}"`)
    .replace('<svg', '<svg aria-hidden="true" focusable="false"');
}

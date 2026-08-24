/**
 * Decides whether a background colour is light — that is, whether text drawn
 * over it needs to be dark to stay readable.
 *
 * Section colours come from `_meta.json` and frontmatter, which nothing
 * validates, so this has to survive whatever an author writes. Hex in every
 * length and `rgb()` are measured; a named colour cannot be without a DOM,
 * and is treated as dark — not because that guess is better, but because it
 * is the guess this function has always made, and flipping it would re-ink
 * every existing site where it happens to be right.
 *
 * @param color - CSS colour as written by the author, ideally `#rrggbb`
 * @returns true when dark text belongs on this colour
 */
export function isLightColor(color: string): boolean {
  const value = color.trim();

  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,)/]/i);
  if (rgb) return isLightRgb(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));

  const hex = value.replace(/^#/, '');

  // #rgb and #rgba double each digit; 8-digit hex just carries alpha, which
  // luminance ignores — both land on the first six digits below.
  const expanded = hex.length === 3 || hex.length === 4 ? [...hex].map((c) => c + c).join('') : hex;

  const r = parseInt(expanded.substring(0, 2), 16);
  const g = parseInt(expanded.substring(2, 4), 16);
  const b = parseInt(expanded.substring(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;

  return isLightRgb(r, g, b);
}

/** Perceived luminance over the 0.5 midpoint, per ITU-R BT.601 weights. */
function isLightRgb(r: number, g: number, b: number): boolean {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

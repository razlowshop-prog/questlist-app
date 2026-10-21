"""Builds the Succedo mark (italic Playfair "S" over a brass bar) as SVGs with the
letter converted to paths, for the app icon, Android adaptive icon, splash and favicon.
Run: python3 scripts/make-brand-svgs.py && node scripts/render-brand-pngs.cjs
"""
from pathlib import Path
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT = next((ROOT / 'node_modules/@expo-google-fonts/playfair-display/400Regular_Italic').glob('*.ttf'))
OUT = ROOT / 'assets/brand'
BRASS = '#D4B27A'
CARD = '#28221E'  # icon background
BG = '#1C1815'  # app background (splash)

font = TTFont(FONT)
glyphs = font.getGlyphSet()
name = font.getBestCmap()[ord('S')]
bounds = BoundsPen(glyphs)
glyphs[name].draw(bounds)
xmin, ymin, xmax, ymax = bounds.bounds
gw, gh = xmax - xmin, ymax - ymin


def mark(size: float, scale: float, color: str) -> str:
    """The S and bar centred in a size x size box; scale = S height as share of the box."""
    s_h = size * scale
    k = s_h / gh
    s_w = gw * k
    gap = size * 0.03 * scale / 0.58
    bar_w = size * 0.26 * scale / 0.58
    bar_h = size * 0.016 * scale / 0.58
    total = s_h + gap + bar_h
    top = (size - total) / 2
    left = (size - s_w) / 2
    # Font units have y going up; flip and move the glyph's box to (left, top).
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(TransformPen(pen, (k, 0, 0, -k, left - xmin * k, top + ymax * k)))
    bar_x = (size - bar_w) / 2
    bar_y = top + s_h + gap
    return (
        f'<path d="{pen.getCommands()}" fill="{color}"/>'
        f'<rect x="{bar_x:.2f}" y="{bar_y:.2f}" width="{bar_w:.2f}" height="{bar_h:.2f}" fill="{color}"/>'
    )


def svg(size: int, body: str, bg: str | None) -> str:
    rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{rect}{body}</svg>\n'


OUT.mkdir(parents=True, exist_ok=True)
files = {
    'icon.svg': svg(1024, mark(1024, 0.58, BRASS), CARD),
    # Adaptive icon: mark kept inside the central 66% safe zone.
    'android-icon-foreground.svg': svg(1024, mark(1024, 0.40, BRASS), None),
    'android-icon-background.svg': svg(1024, '', CARD),
    'android-icon-monochrome.svg': svg(1024, mark(1024, 0.40, '#FFFFFF'), None),
    'splash-icon.svg': svg(1024, mark(1024, 0.80, BRASS), None),
    'favicon.svg': svg(48, mark(48, 0.62, BRASS), CARD),
}
for fname, content in files.items():
    (OUT / fname).write_text(content)
print('wrote', ', '.join(files))

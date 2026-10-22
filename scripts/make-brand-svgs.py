"""Builds the Succedo mark (italic Playfair "S" in an ice-blue to violet gradient with a
violet glow, over a blue-to-violet bar, on a navy glow) as SVGs with the letter converted
to paths, for the app icon, Android adaptive icon, splash and favicon (design thread,
"home-variant-f-spec", section 4).
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
S_TOP, S_BOTTOM = '#C6F4FF', '#8F7BFF'  # the S, top to bottom
BAR_LEFT, BAR_RIGHT = '#7FD6FF', '#6A5BFF'
GLOW = '#6A5BFF'
NAVY, NIGHT = '#23305a', '#12151f'  # icon background glow; splash background

font = TTFont(FONT)
glyphs = font.getGlyphSet()
name = font.getBestCmap()[ord('S')]
bounds = BoundsPen(glyphs)
glyphs[name].draw(bounds)
xmin, ymin, xmax, ymax = bounds.bounds
gw, gh = xmax - xmin, ymax - ymin


def mark(size: float, scale: float, color: str | None = None, glow: bool = True) -> str:
    """The S and bar centred in a size x size box; scale = S height as share of the box.
    Without a color, the S and bar use the brand gradients and the S glows violet."""
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
    d = pen.getCommands()
    if color:
        return (
            f'<path d="{d}" fill="{color}"/>'
            f'<rect x="{bar_x:.2f}" y="{bar_y:.2f}" width="{bar_w:.2f}" height="{bar_h:.2f}" fill="{color}"/>'
        )
    blur = size * 48 / 1024
    defs = (
        f'<defs><linearGradient id="s" gradientUnits="userSpaceOnUse" x1="0" y1="{top:.2f}" x2="0" y2="{top + s_h:.2f}">'
        f'<stop offset="0" stop-color="{S_TOP}"/><stop offset="1" stop-color="{S_BOTTOM}"/></linearGradient>'
        f'<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{BAR_LEFT}"/>'
        f'<stop offset="1" stop-color="{BAR_RIGHT}"/></linearGradient>'
        f'<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{blur:.1f}"/></filter></defs>'
    )
    halo = f'<path d="{d}" fill="{GLOW}" opacity="0.6" filter="url(#glow)"/>' if glow else ''
    return (
        defs + halo + f'<path d="{d}" fill="url(#s)"/>'
        f'<rect x="{bar_x:.2f}" y="{bar_y:.2f}" width="{bar_w:.2f}" height="{bar_h:.2f}" rx="{bar_h / 2:.2f}" fill="url(#bar)"/>'
    )


def navy(size: int) -> str:
    """The icon background: a navy glow a little above the middle, fading to night."""
    return (
        '<defs><radialGradient id="bg" cx="50%" cy="40%" r="70%">'
        f'<stop offset="0" stop-color="{NAVY}"/><stop offset="1" stop-color="{NIGHT}"/></radialGradient></defs>'
        f'<rect width="{size}" height="{size}" fill="url(#bg)"/>'
    )


def svg(size: int, body: str, bg: str | None = None) -> str:
    rect = f'<rect width="{size}" height="{size}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{rect}{body}</svg>\n'


OUT.mkdir(parents=True, exist_ok=True)
files = {
    'icon.svg': svg(1024, navy(1024) + mark(1024, 0.58)),
    # Adaptive icon: mark kept inside the central 66% safe zone.
    'android-icon-foreground.svg': svg(1024, mark(1024, 0.40)),
    'android-icon-background.svg': svg(1024, navy(1024)),
    'android-icon-monochrome.svg': svg(1024, mark(1024, 0.40, '#FFFFFF')),
    'splash-icon.svg': svg(1024, mark(1024, 0.80)),
    'favicon.svg': svg(48, navy(48) + mark(48, 0.62, glow=False)),
}
for fname, content in files.items():
    (OUT / fname).write_text(content)
print('wrote', ', '.join(files))

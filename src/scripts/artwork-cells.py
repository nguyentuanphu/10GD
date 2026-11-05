#!/usr/bin/env python3
"""Generate per-cell artwork thumbnails used by lists (v1.6 bandwidth work).

Run after any change to dist/artwork/*.webp sheets, SPRITE_GRID, REVIEWED_DISH_ART or
INGREDIENT_ART in src/frontend/artwork.ts:

    python3 src/scripts/artwork-cells.py

Each painted cell is cropped exactly like spriteCellStyle() in artwork.ts does on screen
(square, 97% of the smaller cell side, centred on the measured cell and clamped to the
sheet). v1.7.4: dishes keep the painted cell's own resolution (no downscale, ~300 px — lists show
them at up to 170 CSS px, i.e. ~510 device px on a 3× phone) and ingredients are 192 px; WebP
quality 90. v1.6 used 192/128 px at quality 72, which looked blurred and washed out. Full sheets stay
unchanged and are still used by detail views. dist/artwork/cells/manifest.json records
the source sheet hashes; `npm run check` fails when a sheet changes without regenerating.
Requires Pillow with WebP support. Output is committed (CI does not run this script).
"""
import hashlib, io, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'dist', 'artwork')
OUT = os.path.join(ART, 'cells')
SIZES = {'dish': 0, 'ingredient': 192}  # 0 = keep the cell's native size
QUALITY = 90

src = open(os.path.join(ROOT, 'src', 'frontend', 'artwork.ts'), encoding='utf8').read()
grid = json.loads(re.search(r'const SPRITE_GRID=(\{.*?\});', src).group(1))
ingredient_art = json.loads(re.search(r'const INGREDIENT_ART=(\{.*?\});', src).group(1))
reviewed_block = re.search(r'const REVIEWED_DISH_ART=\{(.*?)\n\};', src, re.S).group(1)
dish_cells = sorted({int(v) for v in re.findall(r'"[^"]+":\s*(\d+)', reviewed_block)})
overrides = dict(re.findall(r"'([^']+)':'artwork/corrections/([^']+)\.webp'", re.search(r'const DISH_ART_OVERRIDES=\{(.*?)\};', src).group(1)))
ingredient_cells = sorted(set(int(v) for v in ingredient_art.values()))

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:16]

def crop_cell(im, g, n):
    N = g[6]; scale = im.width / N
    xs = [0, g[0], g[1], g[2], N]; ys = [0, g[3], g[4], g[5], N]
    cx, cy = n % 4, n // 4
    size = min(xs[cx + 1] - xs[cx], ys[cy + 1] - ys[cy]) * .97
    mx, my = (xs[cx] + xs[cx + 1]) / 2, (ys[cy] + ys[cy + 1]) / 2
    left = min(max(mx - size / 2, 0), N - size); top = min(max(my - size / 2, 0), N - size)
    box = tuple(round(v * scale) for v in (left, top, left + size, top + size))
    return im.crop(box)

def save(img, size, name):
    img = img.convert('RGB')
    if size and img.width != size: img = img.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'WEBP', quality=QUALITY, method=6)
    data = buf.getvalue(); open(os.path.join(OUT, name), 'wb').write(data); return len(data)

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.webp'): os.remove(os.path.join(OUT, f))
sheets, files = {}, {}
open_sheets = {}
def sheet(name):
    if name not in open_sheets:
        path = os.path.join(ART, name + '.webp'); open_sheets[name] = Image.open(path); sheets[name] = sha(path)
    return open_sheets[name]
for cell in dish_cells:
    name = 'dishes-v%d' % (cell // 16 + 1)
    files['d%d.webp' % cell] = save(crop_cell(sheet(name), grid[name], cell % 16), SIZES['dish'], 'd%d.webp' % cell)
for cell in ingredient_cells:
    name = 'ingredients-v%d' % (cell // 16 + 1)
    files['i%d.webp' % cell] = save(crop_cell(sheet(name), grid[name], cell % 16), SIZES['ingredient'], 'i%d.webp' % cell)
for rid, file in overrides.items():
    path = os.path.join(ART, 'corrections', file + '.webp'); sheets['corrections/' + file] = sha(path)
    files[file + '.webp'] = save(Image.open(path), SIZES['dish'], file + '.webp')
manifest = {'version': 1, 'sizes': SIZES, 'quality': QUALITY, 'sheets': dict(sorted(sheets.items())), 'files': len(files), 'bytes': sum(files.values())}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, sort_keys=True)
print('Generated %d cells (%d bytes) from %d sheets.' % (len(files), manifest['bytes'], len(sheets)))

// Screenshots the figure pages in docs/images/src/ into docs/images/*.png
// (light + dark, English + Chinese where the page has text in both).
//
//   node scripts/docs/render.mjs              # all figures
//   node scripts/docs/render.mjs tick-loop    # just one
//
// Needs a Chromium-based browser: set EDGE (or CHROME) to its path if it is
// not in the usual place. ImageMagick (`magick`) trims and compresses.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const src = join(root, 'docs/images/src');
const out = join(root, 'docs/images');

const FIGURES = ['tick-loop', 'ladder', 'scenarios', 'presets-vs-app'];
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : FIGURES;

const candidates = [
    process.env.EDGE, process.env.CHROME,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const browser = candidates.find(p => existsSync(p));
if (!browser) throw new Error('No Chromium-based browser found; set EDGE or CHROME');

const profile = process.env.BROWSER_PROFILE || mkdtempSync(join(tmpdir(), 'stock-sim-render-'));

for (const name of wanted) {
    for (const lang of ['en', 'zh']) {
        for (const theme of ['light', 'dark']) {
            const file = join(out, `${name}${lang === 'zh' ? '-zh' : ''}-${theme}.png`);
            const raw = file.replace(/\.png$/, '.raw.png');
            const url = `${pathToFileURL(join(src, `${name}.html`)).href}#${theme},${lang}`;
            execFileSync(browser, [
                '--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`,
                '--force-device-scale-factor=2', '--window-size=960,1400',
                '--default-background-color=00000000', '--virtual-time-budget=4000',
                `--screenshot=${raw}`, url,
            ], { stdio: 'ignore' });
            // Trim the transparent margin, then squeeze the file
            execFileSync('magick', [raw, '-trim', '+repage', '-strip', '-colors', '256', `PNG8:${file}`]);
            rmSync(raw);
            console.log(`${file.slice(root.length)}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
        }
    }
}
if (!process.env.BROWSER_PROFILE) rmSync(profile, { recursive: true, force: true });

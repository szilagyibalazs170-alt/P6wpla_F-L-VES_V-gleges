// Egyetlen önálló HTML-t épít a web/src fájlokból (betűtípusok base64-ben).
// Kimenet: web/dist/index.html és android/app/src/main/assets/index.html
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => readFileSync(join(root, p));
const b64 = p => rd(p).toString('base64');

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const face = (fam, file, weight, range, style = 'normal') =>
  `@font-face{font-family:'${fam}';font-style:${style};font-display:swap;font-weight:${weight};src:url(data:font/woff2;base64,${b64('web/fonts/' + file)}) format('woff2');unicode-range:${range}}`;

const fonts = [
  face('Manrope', 'manrope-latin-wght-normal.woff2', '200 800', LATIN),
  face('Manrope', 'manrope-latin-ext-wght-normal.woff2', '200 800', LATIN_EXT),
  face('Big Shoulders Display', 'big-shoulders-display-latin-200-normal.woff2', 200, LATIN),
  face('Big Shoulders Display', 'big-shoulders-display-latin-300-normal.woff2', 300, LATIN),
  face('Big Shoulders Display', 'big-shoulders-display-latin-800-normal.woff2', 800, LATIN),
  face('Fraunces', 'fraunces-latin-full-normal.woff2', '100 900', LATIN),
  face('Fraunces', 'fraunces-latin-ext-full-normal.woff2', '100 900', LATIN_EXT),
  face('Fraunces', 'fraunces-latin-full-italic.woff2', '100 900', LATIN, 'italic'),
  face('Fraunces', 'fraunces-latin-ext-full-italic.woff2', '100 900', LATIN_EXT, 'italic'),
].join('\n');
const jsDir = join(root, 'web/src/js');
const js = "(() => {\n'use strict';\n" + readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()
  .map(f => `/* ---- ${f} ---- */\n` + readFileSync(join(jsDir, f), 'utf8')).join('\n') + "\n})();";

let html = rd('web/src/index.html').toString();
html = html.replace('/*@FONTS@*/', () => fonts)
  .replace('/*@CSS@*/', () => rd('web/src/style.css').toString())
  .replace('/*@JS@*/', () => js);

for (const out of ['web/dist/index.html', 'android/app/src/main/assets/index.html']) {
  mkdirSync(dirname(join(root, out)), { recursive: true });
  writeFileSync(join(root, out), html);
}
console.log('OK', (html.length / 1024).toFixed(0) + ' KB');

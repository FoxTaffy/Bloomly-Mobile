// Вписывает существующий логотип (assets/bloomly-logo.png) в прозрачный квадратный холст для сплэша: assets/splash-icon.png.
// Рисунок не меняется, только масштаб и положение. Запуск: node scripts/make-splash.mjs
// Зависимость pngjs приходит транзитивно вместе с Expo (в package.json не указана: скрипт нужен редко, не часть приложения).
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SRC = new URL('../assets/bloomly-logo.png', import.meta.url);
const OUT = new URL('../assets/splash-icon.png', import.meta.url);

// Холст 1024×1024 соответствует 288 dp (imageWidth в app.json): Android 12+ показывает иконку сплэша без подложки
// в круге диаметром 192 dp, то есть 66,7 % холста. Окружность, описанную вокруг логотипа, делаем 60 % холста: запас.
const CANVAS = 1024;
const CIRCLE_RATIO = 0.6;

const src = PNG.sync.read(readFileSync(SRC));
const { width: sw, height: sh, data: sd } = src;

// Радиус окружности вокруг непрозрачных пикселей логотипа с центром в центре холста
let maxR = 0;
const cx = (sw - 1) / 2, cy = (sh - 1) / 2;
for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
  if (sd[(y * sw + x) * 4 + 3] > 8) maxR = Math.max(maxR, Math.hypot(x - cx, y - cy));
}
const scale = (CANVAS * CIRCLE_RATIO) / 2 / maxR;
const dw = Math.round(sw * scale), dh = Math.round(sh * scale);
const ox = Math.round((CANVAS - dw) / 2), oy = Math.round((CANVAS - dh) / 2);

const out = new PNG({ width: CANVAS, height: CANVAS });
out.data.fill(0);
// Билинейная выборка с предумноженной альфой, чтобы края не темнели
const px = (x, y) => {
  x = Math.min(sw - 1, Math.max(0, x)); y = Math.min(sh - 1, Math.max(0, y));
  const i = (y * sw + x) * 4, a = sd[i + 3] / 255;
  return [sd[i] * a, sd[i + 1] * a, sd[i + 2] * a, a];
};
for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
  const fx = (x + 0.5) / scale - 0.5, fy = (y + 0.5) / scale - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const p = [px(x0, y0), px(x0 + 1, y0), px(x0, y0 + 1), px(x0 + 1, y0 + 1)];
  const w = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
  const acc = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) for (let c = 0; c < 4; c++) acc[c] += p[k][c] * w[k];
  const a = acc[3];
  const o = ((oy + y) * CANVAS + (ox + x)) * 4;
  if (a > 0) {
    out.data[o] = Math.round(acc[0] / a); out.data[o + 1] = Math.round(acc[1] / a); out.data[o + 2] = Math.round(acc[2] / a);
    out.data[o + 3] = Math.round(a * 255);
  }
}
writeFileSync(OUT, PNG.sync.write(out));
console.log(`splash-icon.png: холст ${CANVAS}, логотип ${dw}×${dh}, описанная окружность ${Math.round(maxR * scale * 2)} px (${Math.round(maxR * scale * 2 / CANVAS * 100)} % холста)`);

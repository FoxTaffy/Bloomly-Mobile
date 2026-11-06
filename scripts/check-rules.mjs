// Проверка правил из docs/ARCHITECTURE.md. Запуск: npm run rules. Ненулевой код выхода — нарушения есть.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ALLOW_HEX = new Set(['src/theme/tokens.ts']); // единственный TS-файл с цветами
const rules = [
  { id: 'hex-color', re: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/, msg: 'Цвет вне src/theme/tokens.ts: используй класс brand-* или colors из tokens', skip: (f) => ALLOW_HEX.has(f) },
  { id: 'rgb-color', re: /\brgba?\(/, msg: 'rgb()/rgba(): используй токены бренда (для прозрачности — bg-brand-*/50)', skip: () => false },
  { id: 'rn-safeareaview', re: /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*'react-native'/, msg: 'SafeAreaView из react-native устарел: используй <Screen> / useSafeAreaInsets', skip: () => false },
  { id: 'magic-statusbar', re: /StatusBar\.currentHeight|Platform\.OS\s*===\s*'ios'\s*\?\s*(20|44|47|59)\b/, msg: 'Высоты статус-бара/выреза — только из useSafeAreaInsets', skip: () => false },
  { id: 'web-api', re: /\b(localStorage|sessionStorage|document\.|window\.)/, msg: 'Веб-API в нативном коде: используй SecureStore / AsyncStorage', skip: () => false },
  { id: 'insecure-token', re: /AsyncStorage[^\n]*(token|Token)/, msg: 'Токены хранятся только в SecureStore (src/lib/storage.ts)', skip: () => false },
  { id: 'http-url', re: /['"`]http:\/\/(?!localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.)/, msg: 'Только https (iOS ATS / Android cleartext)', skip: () => false },
];

function* walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(n) && !n.endsWith('.d.ts')) yield p;
  }
}

let bad = 0;
for (const base of ['app', 'src']) {
  for (const file of walk(join(ROOT, base))) {
    const rel = relative(ROOT, file);
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      for (const r of rules) if (!r.skip(rel) && r.re.test(line)) { console.log(`${rel}:${i + 1}  [${r.id}] ${r.msg}`); bad++; }
    });
  }
}
console.log(bad ? `\nНарушений: ${bad}` : 'Правила соблюдены');
process.exit(bad ? 1 : 0);

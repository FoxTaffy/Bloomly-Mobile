// Проверка входа и ссылок: src/shared/route.ts и src/shared/links.ts. Запуск: npm run test:route.
// Guard-предикаты ниже повторяют Stack.Protected в app/_layout.tsx и app/(auth)/_layout.tsx.
import { entryRoute, isProtectedTarget } from '../src/shared/route.ts';
import { systemPathToRoute, webPathToRoute } from '../src/shared/links.ts';

let bad = 0;
const fail = (m) => { console.log('ОШИБКА:', m); bad++; };

// 1. Для каждого состояния целевой маршрут доступен под guard (нет цикла и нет «Unmatched»)
const guards = {
  '/(tabs)/feed': (s) => s.authenticated && !s.needsOnboarding,
  '/(auth)/login': (s) => !s.authenticated,
  '/(auth)/onboarding': (s) => s.authenticated && s.needsOnboarding,
};
for (const hydrated of [false, true]) for (const authenticated of [false, true]) for (const needsOnboarding of [false, true]) {
  if (needsOnboarding && !authenticated) continue; // онбординг возможен только после входа
  const s = { hydrated, authenticated, needsOnboarding };
  const t = entryRoute(s);
  if (!hydrated) { if (t !== null) fail(`до восстановления сессии маршрута быть не должно: ${JSON.stringify(s)}`); continue; }
  if (!t) fail(`нет маршрута для ${JSON.stringify(s)}`);
  else if (!guards[t](s)) fail(`${t} недоступен под guard для ${JSON.stringify(s)}`);
}
// Вход → после входа (без онбординга) ведём в ленту, а не обратно на вход
if (entryRoute({ hydrated: true, authenticated: true, needsOnboarding: false }) !== '/(tabs)/feed') fail('вошедший без онбординга не попадает в ленту');

// 2. Входящие адреса
const cases = [
  ['/', '/'], ['//', '/'], ['', '/'],
  ['/feed', '/feed'],
  ['/post/0b0a1e28-5b7b-4c3a-9d34-6a1e1d7a5f11', '/post/0b0a1e28-5b7b-4c3a-9d34-6a1e1d7a5f11'],
  ['/something-unknown', '/something-unknown'],
  ['/something-unknown?x=1', '/something-unknown'],
  ['/auth/callback?token=abc', '/auth/callback?token=abc'],
];
for (const [input, want] of cases) {
  const got = systemPathToRoute(input);
  if (got !== want) fail(`systemPathToRoute(${input}) = ${got}, ожидалось ${want}`);
}
if (webPathToRoute('https://bloomly.fun/post/0b0a1e28-5b7b-4c3a-9d34-6a1e1d7a5f11') !== '/post/0b0a1e28-5b7b-4c3a-9d34-6a1e1d7a5f11') fail('https post');
if (webPathToRoute('https://evil.example/post/x') !== null) fail('чужой хост должен отбрасываться');

// 3. Какие адреса запоминаются до входа
for (const p of ['/post/0b0a1e28-5b7b-4c3a-9d34-6a1e1d7a5f11', '/profile/fox', '/groups/cool', '/events/e1', '/messages/x', '/notifications', '/settings']) {
  if (!isProtectedTarget(p)) fail(`должен запоминаться: ${p}`);
}
for (const p of ['/', '/feed', '/login', '/legal/terms', '/something-unknown', '/postsomething']) {
  if (isProtectedTarget(p)) fail(`не должен запоминаться: ${p}`);
}

console.log(bad ? `Нарушений: ${bad}` : 'Вход и ссылки проверены: все состояния, входящие адреса, защищённые адреса');
process.exit(bad ? 1 : 0);

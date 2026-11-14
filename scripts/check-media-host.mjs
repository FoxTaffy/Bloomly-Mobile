// Проверка правила токена из src/shared/mediaHost.ts. Запуск: npm run test:media-host (нужен Node с --experimental-strip-types, 22.6+).
import { isOwnHttpsUrl } from '../src/shared/mediaHost.ts';

const OWN = 'https://bloomly.fun';
const allow = [
  'https://bloomly.fun/s3/bloomly/posts/a.jpg',
  'https://BLOOMLY.fun/s3/bloomly/posts/a.jpg',
  'https://bloomly.fun:443/s3/bloomly/messages/v.m4a',
  'https://bloomly.fun/api/media/private?x=1',
];
const deny = [
  'http://bloomly.fun/s3/a.jpg', // не https
  'https://bloomly.fun.evil.com/a.jpg', // префикс хоста
  'https://evil.com/?https://bloomly.fun', // адрес внутри запроса
  'https://evil.com/bloomly.fun/a.jpg', // адрес внутри пути
  'https://bloomly.fun@evil.com/a.jpg', // userinfo: настоящий хост evil.com
  'https://user:pass@bloomly.fun/a.jpg', // логин и пароль в адресе
  'https://cdn.bloomly.fun/a.jpg', // поддомен
  'https://xbloomly.fun/a.jpg', // суффикс
  'https://evilbloomly.fun/a.jpg',
  '//bloomly.fun/a.jpg', // без схемы
  'bloomly.fun/a.jpg',
  'file:///etc/passwd',
  'data:text/plain,bloomly.fun',
  '',
  'не адрес',
];

let bad = 0;
for (const u of allow) if (!isOwnHttpsUrl(u, OWN)) { console.log('ДОЛЖЕН проходить:', u); bad++; }
for (const u of deny) if (isOwnHttpsUrl(u, OWN)) { console.log('НЕ должен проходить:', u); bad++; }
// Если сама настройка API не https (локальная разработка), токен не уходит никуда
if (isOwnHttpsUrl('http://10.0.2.2:8080/s3/a.jpg', 'http://10.0.2.2:8080')) { console.log('http-база не должна проходить'); bad++; }
console.log(bad ? `Нарушений: ${bad}` : `Правило токена соблюдено (${allow.length} разрешённых, ${deny.length + 1} запрещённых адресов)`);
process.exit(bad ? 1 : 0);

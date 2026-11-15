// Проверка правил @ника: src/shared/username.ts. Запуск: npm run test:profile.
import { speciesLabel } from '../src/shared/fursonaSpecies.ts';
import { normalizeUsername, usernameBreaksRules, usernameValid } from '../src/shared/username.ts';

let bad = 0;
const eq = (a, b, m) => { if (a !== b) { console.log(`ОШИБКА: ${m}: ${a} ≠ ${b}`); bad++; } };

eq(normalizeUsername('  Fox Taffy!! '), '_fox_taffy_', 'нормализация: регистр, пробелы, лишние знаки');
eq(normalizeUsername('a'.repeat(40)).length, 30, 'нормализация: не длиннее 30');
eq(usernameValid('fox_taffy'), true, 'обычный ник');
eq(usernameValid('ab'), false, 'короче 3');
eq(usernameValid('1fox'), false, 'начинается с цифры');
eq(usernameValid('fox_'), false, 'кончается «_»');
eq(usernameValid('fo__x'), false, 'двойное «_»');
eq(usernameValid('12345'), false, 'только цифры');
eq(usernameValid('aaaa'), false, 'один и тот же символ');
eq(usernameBreaksRules(''), false, 'пустой не нарушает форму (длину проверяют отдельно)');

eq(speciesLabel('Fox', 'ru'), 'Лис', 'вид фурсоны по-русски');
eq(speciesLabel('Fox', 'en'), 'Fox', 'вид фурсоны по-английски');
eq(speciesLabel('Unknown Kind', 'ru'), 'Unknown Kind', 'неизвестный вид — как есть');

if (bad) { console.log(`Провалено проверок: ${bad}`); process.exit(1); }
console.log('Ники: все проверки пройдены');

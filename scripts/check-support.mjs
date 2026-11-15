// Проверка поддержки: src/shared/faq.ts и src/shared/support.ts. Запуск: npm run test:support.
import { searchFaq, FAQ_IDS } from '../src/shared/faq.ts';
import { canSubmitTicket } from '../src/shared/support.ts';

let bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.log(`ОШИБКА: ${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); bad++; } };

const items = [
  { id: '1', q: 'Как изменить фотографию профиля?', a: 'Откройте настройки и загрузите картинку.' },
  { id: '2', q: 'Что такое верификация?', a: 'Значок подлинности аккаунта.' },
];
eq(searchFaq(items, '').length, 2, 'пустой запрос — все вопросы');
eq(searchFaq(items, 'фотография').map((i) => i.id), ['1'], 'основа слова: «фотография» находит «фотографию»');
eq(searchFaq(items, 'значок верификация').map((i) => i.id), ['2'], 'все слова запроса, вопрос и ответ');
eq(searchFaq(items, 'верификация картинка').length, 0, 'слова из разных вопросов не совпадают');
eq(searchFaq(items, 'я').length, 2, 'односимвольные слова не учитываются');
eq(FAQ_IDS.includes('4') || FAQ_IDS.includes('5'), false, 'вопросы про Dealers Den и магазин не показываются');

eq(canSubmitTicket('ab', 'достаточно длинное описание'), false, 'тема короче 3');
eq(canSubmitTicket('Тема', 'коротко'), false, 'текст короче 10');
eq(canSubmitTicket('  Тема  ', 'Подробное описание проблемы'), true, 'нормальное обращение');

if (bad) { console.log(`Провалено проверок: ${bad}`); process.exit(1); }
console.log('Поддержка: все проверки пройдены');

// Проверка логики историй: src/shared/stories.ts. Запуск: npm run test:stories.
import { buildStoryReply, groupStories, isGroupSeen, nextPos, parseStoryReply, prevPos, timeLeft } from '../src/shared/stories.ts';

let bad = 0;
const fail = (m) => { console.log('ОШИБКА:', m); bad++; };
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail(`${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

const u = (id) => ({ id, username: id, display_name: null, avatar_url: null });
const st = (id, user, at) => ({ id, user_id: user, user: u(user), created_at: at, expires_at: '2030-01-01T00:00:00Z', image_url: `https://bloomly.fun/s3/x/${id}.jpg`, video_url: null, score: 0, my_vote: 0, view_count: 0 });

const stories = [st('s3', 'b', '2026-01-01T03:00:00Z'), st('s2', 'a', '2026-01-01T02:00:00Z'), st('s1', 'a', '2026-01-01T01:00:00Z')];
const groups = groupStories(stories);
eq(groups.map((g) => g.map((s) => s.id)), [['s3'], ['s1', 's2']], 'группы: порядок авторов по первому появлению, внутри — старые первыми');
eq(isGroupSeen(groups[1], new Set(['s1'])), false, 'не все просмотрены');
eq(isGroupSeen(groups[1], new Set(['s1', 's2'])), true, 'все просмотрены');
eq(isGroupSeen([], new Set()), true, 'пустая группа считается просмотренной (как every на вебе)');

eq(nextPos(groups, 0, 0), { gi: 1, si: 0 }, 'вперёд: следующая группа');
eq(nextPos(groups, 1, 0), { gi: 1, si: 1 }, 'вперёд: внутри группы');
eq(nextPos(groups, 1, 1), null, 'вперёд: конец');
eq(prevPos(groups, 1, 0), { gi: 0, si: 0 }, 'назад: предыдущая группа, её последняя история');
eq(prevPos(groups, 0, 0), null, 'назад: начало');

eq(timeLeft('2026-01-01T00:00:00Z', Date.parse('2026-01-01T05:00:00Z')), null, 'истекла');
eq(timeLeft('2026-01-01T06:12:00Z', Date.parse('2026-01-01T00:00:00Z')), { h: 6, m: 12 }, 'осталось 6ч 12м');

// Ответ на историю: туда и обратно, старый формат, битый JSON, обычный текст
const built = buildStoryReply(st('s1', 'a', '2026-01-01T01:00:00Z'), 'круто!');
const back = parseStoryReply(built, Date.parse('2026-06-01T00:00:00Z'));
eq([back?.replyText, back?.authorName, back?.expired], ['круто!', 'a', false], 'ответ: туда и обратно');
eq(parseStoryReply(built, Date.parse('2031-01-01T00:00:00Z'))?.expired, true, 'ответ: история истекла');
eq(parseStoryReply('[story_reply:https://x/y.jpg|2020-01-01T00:00:00Z|Имя|https://x/a.jpg]\nпривет')?.authorName, 'Имя', 'ответ: формат v1');
eq(parseStoryReply('[story_reply:{oops}]\nтекст')?.expired, true, 'ответ: битый JSON — «истекла»');
eq(parseStoryReply('обычное сообщение'), null, 'обычный текст не ответ');
eq(parseStoryReply(null), null, 'null не ответ');

if (bad) { console.log(`Провалено проверок: ${bad}`); process.exit(1); }
console.log('Истории: все проверки пройдены');

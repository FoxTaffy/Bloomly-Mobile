// Проверка логики чата: src/shared/chat.ts. Запуск: npm run test:chat.
import { albumFiles, canEdit, canForward, compareConversations, conversationTitle, fileKind, forwardedAuthor, isEmojiOnlyText, isMuted, otherUser, reactionChips } from '../src/shared/chat.ts';

let bad = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.log(`ОШИБКА: ${m}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); bad++; } };

const u = (id, name) => ({ id, username: name, display_name: null, avatar_url: null });
// Форма ответа сервера: собеседники — other_participants[].user; participants — строки участников
const dm = { is_group: false, name: null, other_participants: [{ user_id: 'b', user: u('b', 'bob') }], participants: [{ user_id: 'a', user: u('a', 'alice') }, { user_id: 'b', user: u('b', 'bob') }] };
eq(otherUser(dm, 'a')?.username, 'bob', 'собеседник из other_participants');
eq(otherUser({ ...dm, other_participants: [] }, 'a')?.username, 'bob', 'запасной путь: строки участников без себя');
eq(otherUser({ ...dm, is_group: true }, 'a'), null, 'у группы нет собеседника');
eq(conversationTitle({ ...dm, is_group: true, name: 'Клуб' }, 'a', 'Группа'), 'Клуб', 'название группы');
eq(conversationTitle({ ...dm, is_group: true, name: null }, 'a', 'Группа'), 'Группа', 'группа без названия');
eq(conversationTitle(dm, 'a', 'Группа'), 'bob', 'название личного диалога');

const c = (id, pinned, at) => ({ id, my_participant: { archived: false, pinned_at: pinned }, updated_at: at });
const sorted = [c('old', null, '2026-01-01'), c('pin2', '2026-03-02', '2026-01-01'), c('new', null, '2026-02-01'), c('pin1', '2026-03-01', '2026-01-01')].sort(compareConversations).map((x) => x.id);
eq(sorted, ['pin1', 'pin2', 'new', 'old'], 'сортировка: закреплённые по времени закрепления, затем свежие');

eq(isMuted({ my_participant: { archived: false, muted_until: '2030-01-01T00:00:00Z' } }, Date.parse('2026-01-01')), true, 'без звука до даты');
eq(isMuted({ my_participant: { archived: false, muted_until: '2020-01-01T00:00:00Z' } }, Date.parse('2026-01-01')), false, 'срок без звука истёк');

const now = Date.parse('2026-01-02T00:00:00Z');
const msg = (o) => ({ id: 'm', sender_id: 'a', type: 'text', text: 'x', file_url: null, created_at: '2026-01-01T12:00:00Z', ...o });
eq(canEdit(msg({}), 'a', now), true, 'правка своего за 12 часов');
eq(canEdit(msg({}), 'b', now), false, 'чужое править нельзя');
eq(canEdit(msg({ created_at: '2025-12-30T00:00:00Z' }), 'a', now), false, 'правка после 24 часов');
eq(canEdit(msg({ type: 'voice' }), 'a', now), false, 'голосовое не правится');
eq(canForward(msg({ type: 'payment_request' })), false, 'счёт не пересылается');
eq(canForward(msg({ type: 'post_share' })), true, 'пост пересылается');

eq(isEmojiOnlyText('🔥🔥'), true, 'эмодзи без текста');
eq(isEmojiOnlyText('🔥🔥🔥🔥'), false, 'больше трёх эмодзи — обычный текст');
eq(isEmojiOnlyText('привет 🔥'), false, 'текст с эмодзи');
eq(forwardedAuthor(msg({ text: '↩️ Переслано от Боб\nпривет' }), 'Скрыт'), 'Боб', 'пересылка по старому префиксу');
eq(forwardedAuthor(msg({ forwarded_from_sender_id: 'z', forwarded_from_sender: null }), 'Скрыт'), 'Скрыт', 'автор скрыт настройками');
eq(fileKind({ type: 'text', file_url: 'https://x/a.jpg' }), 'image', 'тип файла: картинка');
eq(fileKind({ type: 'text', file_url: 'https://x/a.mp4' }), 'video', 'тип файла: видео');
eq(fileKind({ type: 'voice', file_url: 'https://x/a.m4a' }), 'audio', 'тип файла: голосовое');
eq(fileKind({ type: 'text', file_url: null }), null, 'нет файла');
eq(albumFiles(msg({ metadata: { files: [{ url: 'https://x/1.jpg' }, { url: 'https://x/2.mov' }, { nope: 1 }] } })).map((f) => f.type), ['image', 'video'], 'альбом: типы и мусор отброшен');
eq(reactionChips(msg({ reactions: { '👍': ['a', 'b'], '🔥': [] } }), 'a'), [{ emoji: '👍', count: 2, mine: true }], 'реакции: пустые отброшены, своя отмечена');

if (bad) { console.log(`Провалено проверок: ${bad}`); process.exit(1); }
console.log('Чат: все проверки пройдены');

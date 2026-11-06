# Bloomly Mobile: архитектура

Один кодовая база на Expo (React Native) для **iOS**, **Android** и **Google Pixel**. Бэкенд общий с вебом (`https://bloomly.fun/api`).
Проверка правил: `npm run check` (типы + `scripts/check-rules.mjs`). Перед коммитом она должна проходить.

## Платформы

| Платформа | Что учитываем |
|---|---|
| iOS (iPhone, iPad) | `supportsTablet: true`, динамический остров и home-индикатор через safe-area insets, ATS (только https), Keychain для токенов |
| Android (общий) | adaptive icon, жест «назад» (`predictiveBackGestureEnabled`), `softwareKeyboardLayoutMode: resize`, Keystore для токенов, минимум разрешений |
| Google Pixel | Android 15+ рисует приложение edge-to-edge: отступы только из `useSafeAreaInsets` (компонент `Screen`), жестовая навигация, вырез камеры, Pixel Fold и планшет — классы ширины `medium`/`expanded` (`useWindowClass`) |

Правила адаптивности:
1. Никаких констант высоты статус-бара, выреза или нижней панели. Только `Screen` или `useSafeAreaInsets`.
2. Раскладка строится от класса ширины окна (`compact` < 600 ≤ `medium` < 840 ≤ `expanded`), а не от `Platform.OS`.
3. `Platform.OS` — только для реально разного поведения (шрифт, haptics, системные диалоги), каждый случай с комментарием.
4. Ориентация: портрет на телефонах; на `medium`/`expanded` разрешим альбом, когда дойдём до планшетной вёрстки.
5. Тёмная тема — единственная (бренд-гайд), `userInterfaceStyle: dark`.

## Структура

```
app/                    маршруты expo-router (только экраны и layout, без логики)
  _layout.tsx           провайдеры: SafeArea, QueryClient, шрифты, сплэш
  (auth)/               вход, регистрация, онбординг (без нижних вкладок)
  (tabs)/               Лента · Обзор · Чаты · Профиль
src/
  api/client.ts         axios: X-Client: mobile, X-Device-Id, Bearer
  api/<домен>.ts        запросы по доменам бэкенда (posts, groups, events…) + типы ответов
  stores/               zustand: только клиентское состояние (сессия, настройки)
  hooks/                useWindowClass, хуки данных на TanStack Query (usePosts…)
  lib/                  storage (SecureStore), чистые утилиты
  theme/tokens.ts       единственный TS-файл с цветами и брейкпоинтами
  components/ui/        общие примитивы (Screen, Button, Card, Field…)
  components/<домен>/   блоки конкретного раздела
  types/                общие типы
scripts/check-rules.mjs проверка правил архитектуры
```

Зависимости направлены вниз: `app → components → hooks → api/stores → lib/theme`. Экран не ходит в axios напрямую.

## Стили (DRY, как на вебе)

- Только NativeWind-классы с токенами `brand-*` из `tailwind.config.js`. Хардкод цветов запрещён (проверяет `npm run rules`);
  для нативных пропсов (`StatusBar`, `tabBarStyle`) — `colors` из `src/theme/tokens.ts`.
- Повторяющийся блок (2+ раза) — компонент в `components/ui`, а не копия цепочки классов.
- Шрифт Nunito: `font-nunito`, `font-nunito-medium`, `font-nunito-bold` (в RN начертание = семейство, `font-bold` не работает).
- Токены держим синхронно с `frontend/src/assets/style.css` и `docs/brand-guide.md` основного репозитория. Меняем там — меняем здесь.
- Каждый экран оборачивается в `<Screen>`. Модалки — нативные листы/`Modal`, оформление по образцу `CreateGroupModal.vue`
  (карточка `brand-card`, рамка `brand-border`, радиус 3xl).

## Данные и авторизация

Бэкенд уже поддерживает мобильные клиенты:
- Заголовок `X-Client: mobile` → в ответах login / register / refresh / OAuth-callback добавляется `refreshToken` в теле (куки нет).
- `X-Device-Id` — стабильный uuid устройства (SecureStore), иначе каждый вход считается новым устройством.
- Access-токен (15 мин) — только в памяти (`stores/auth`). Refresh-токен — только в SecureStore.
- На 401: один общий refresh на все параллельные запросы (single-flight), `POST /auth/refresh` с refresh-токеном; ответ `null` = выйти,
  сетевая ошибка = не выходить. Образец — `frontend/src/api.ts` и `lib/sessionRefresh`.
- OAuth: открыть `/auth/oauth/:provider?client=mobile` через `expo-web-browser`; бэкенд вернёт на `bloomly://auth/callback`
  (токен или `?signup=…` для онбординга). Схема `bloomly` уже в `app.json`.
- Пуши: `POST /push/expo-token {token, platform}` и `/push/expo-unsubscribe` (бэкенд готов, плагин `expo-notifications` подключён).
  На Android нужен канал уведомлений и FCM-ключ в EAS; на iOS — APNs-ключ.
- Realtime: WebSocket бэкенда (`modules/realtime`), присутствие и чаты. Переподключение при возврате приложения на передний план.
- Данные запросов — TanStack Query (кэш, пагинация `useInfiniteQuery`); zustand — только клиентское состояние.

## Карта экранов: веб → мобильное приложение

Приоритет: P0 — ядро, P1 — следом, P2 — позже, `web` — оставляем в вебе.

| Раздел | Веб-маршрут | Мобильный маршрут | P |
|---|---|---|---|
| Вход / регистрация / OAuth | `/login`, `/auth/callback` | `(auth)/login`, `(auth)/register` | P0 |
| Онбординг, 18+, родительское согласие | `/onboarding`, `/onboarding/age-verification`, `/parental-consent` | `(auth)/onboarding`, `(auth)/age` | P0 |
| Лента | `/` | `(tabs)/index` | P0 |
| Пост | `/post/:id` | `post/[id]` | P0 |
| Обзор, поиск | `/explore`, `/search` | `(tabs)/explore`, `search` | P0 |
| Профиль | `/profile/:username` | `(tabs)/profile`, `profile/[username]` | P0 |
| Сообщения | `/messages` | `(tabs)/messages`, `chat/[id]` | P0 |
| Уведомления | `/notifications` | `notifications` | P0 |
| Закладки, отложенные | `/bookmarks`, `/scheduled-posts` | `bookmarks`, `scheduled` | P1 |
| Друзья, подписки | `/friends`, `/subscriptions` | `friends` | P1 |
| Настройки профиля | `/settings/profile` | `settings/*` | P1 |
| Группы | `/groups`, `/groups/:slug` | `groups/*` | P1 |
| Мероприятия | `/events`, `/events/:id`, `/my-tickets` | `events/*` | P1 |
| Магазин, стикеры | `/shop`, `/stickers/*` | `shop/*` | P2 |
| Dealers' Den, заказы | `/dealers-den/*`, `/groups/:slug/orders/:id` | `den/*` | P2 |
| Кошелёк, платежи | `/payment/result` | внешний браузер → deep link | P2 |
| Поддержка, помощь, юр. страницы | `/support`, `/help`, `/terms`, `/privacy`, `/dmca` | `support`, `legal/[doc]` | P2 |
| Админка, управление группой, автоматизация | `/admin`, `/groups/:slug/dashboard\|business\|admin`, `/automation` | — | web |

Правила переноса: Shop и Dealers' Den остаются разными разделами (стикеры и рамки только в Shop). Деньги: платежи через
магазины приложений (Apple/Google) для цифровых товаров требуют отдельного решения до P2, см. «Открытые вопросы».

## Открытые вопросы (решить до вёрстки соответствующих экранов)

1. Иконка, adaptive icon (foreground/monochrome для Android 13+) и сплэш: ассетов пока нет, нужны от дизайнера.
2. Оплата BLM/подписок внутри iOS-приложения: правила App Store и Google Play по цифровым товарам.
3. 18+ контент и NSFW-режим: требования магазинов приложений к модерации и возрастному рейтингу.
4. EAS: аккаунт, bundle id `app.bloomly.mobile`, ключи APNs и FCM, профили preview/production.
5. Deep links / universal links для `https://bloomly.fun/...` (assetlinks.json и apple-app-site-association на сервере).

## Порядок работы над экраном

1. Найти веб-аналог в таблице, прочитать его `views/*.vue` и `composables/*` — логику не переписывать, а переносить.
2. Добавить типы и запросы в `src/api/<домен>.ts`, хук данных в `src/hooks`.
3. Собрать экран из `components/ui`; нужного нет и оно повторится — сначала добавить примитив.
4. Проверить на compact и medium ширине, с вырезом и жестовой панелью (Pixel), в iOS-симуляторе.
5. `npm run check` — зелёный. Только потом коммит.

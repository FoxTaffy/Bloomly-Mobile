# Bloomly Mobile: гид для разработчика

Это мобильное приложение соцсети Bloomly на Expo. Здесь описано, как устроен репозиторий, как запустить приложение и что делать дальше.

Архитектура, платформы (iOS, Android, Pixel) и карта экранов: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Проверка перед коммитом: `npm run check`.

## Текущее состояние

Репозиторий содержит только каркас: настройки, стек и один стартовый экран с логотипом. Экраны веба ещё не перенесены. Перенос — основная задача на ближайшее время.

## Стек

| Что | Версия | Зачем |
|---|---|---|
| Expo | 57 | сборка и запуск приложения |
| React Native | 0.86 | нативный интерфейс |
| Expo Router | 57 | навигация по файлам в `app/` |
| NativeWind | 4 (Tailwind 3) | стили в стиле Tailwind |
| TypeScript | 6 | типы |
| TanStack Query, axios, zustand | актуальные | запросы к API и состояние |

## Быстрый старт

Нужно: Node.js 22 или новее, Git, телефон с приложением Expo Go или Android-эмулятор.

```
git clone https://github.com/FoxTaffy/Bloomly-Mobile.git
cd Bloomly-Mobile
npm install
npm start
```

`npm install` использует `legacy-peer-deps` из `.npmrc`. Без этого установка падает с ошибкой `ERESOLVE`, не удаляйте этот файл.

После `npm start` появится QR-код. Отсканируйте его камерой телефона в Expo Go. Для Android-эмулятора используйте `npm run android`. Для iPhone нужен Mac или облачная сборка (см. ниже).

## Команды

| Команда | Что делает |
|---|---|
| `npm start` | запускает Metro и показывает QR-код |
| `npm run android` | открывает приложение в Android-эмуляторе |
| `npm run ios` | открывает приложение в симуляторе iOS (только на Mac) |
| `npm run typecheck` | проверяет типы без сборки |
| `npm run build:android` | собирает бандл для Android |

Перед коммитом запускайте `npm run typecheck`. Если проверка падает, не коммитьте.

## Структура

```
app/                 экраны, маршруты по именам файлов (expo-router)
  _layout.tsx        корневой layout, подключает global.css
  index.tsx          стартовый экран
global.css           подключение Tailwind
tailwind.config.js   цвета бренда (brand-*), шрифты
app.json             имя приложения, bundle id, плагины Expo
babel.config.js      настройки сборки, без нужды не менять
metro.config.js      настройки Metro, без нужды не менять
```

Новый экран — это новый файл в `app/`. Например, `app/feed.tsx` откроется по адресу `/feed`.

Цвета берите из `tailwind.config.js` (классы `bg-brand-bg`, `text-brand-offwhite` и т.д.). Не вводите новые цвета вне палитры бренда.

## Откуда брать код

Веб-версия и бэкенд хранятся в основном репозитории проекта, не в этом. Для переноса берите оттуда:

- `frontend/src/api.ts` — клиент API. Сейчас в вебе `baseURL` равен `/api`. Для приложения нужен полный адрес, в проде это `https://bloomly.fun/api`.
- `frontend/src/types` — типы данных.
- `frontend/src/lib`, `frontend/src/utils` — чистая логика, её можно переносить почти без изменений.
- `frontend/src/assets/style.css` — токены дизайна. Их нужно перенести в `tailwind.config.js`.
- `docs/brand-guide.jpg` (макет) и `docs/brand-guide.md` основного репозитория — гайд по бренду: цвета, шрифт Nunito, кнопки, логотип.

Компоненты Vue (`frontend/src/components`, `frontend/src/views`) не копируются напрямую: их нужно переписать на React Native.

## Правила работы

- Мобильный репозиторий: каждая задача в своей ветке (`mobile/<тема>`), в `main` только через Pull Request. Прямые коммиты в `main` — только для веба и его срочных правок (см. `CLAUDE.md` основного репозитория). `mobile/` — отдельный git-репозиторий.
- Сообщения коммитов по стилю веба, на русском: `feat(mobile): ...`, `fix(mobile): ...`, `docs: ...`.
- Не коммитьте `.env`, ключи, пароли и токены. В `.gitignore` уже есть `.env`, но проверяйте `git status` перед коммитом.
- Не добавляйте в репозиторий `node_modules/`, сборки и локальные настройки редакторов. Они уже исключены в `.gitignore`.

## Публикация в магазины

- **Google Play (Android, Pixel и другие):** аккаунт разработчика, разовый взнос около $25.
- **App Store (iPhone):** Apple Developer Program, около $99 в год. Сборку под iOS удобнее делать через EAS Build, так как на Windows и Linux её не собрать.

Аккаунты заводит владелец проекта на своё имя. Сборка и отправка в магазины описываются отдельно, когда до этого дойдём.

## Sentry: ошибки и sourcemaps

Мониторинг ошибок включается переменной `EXPO_PUBLIC_SENTRY_DSN`; пока её нет, SDK не запускается и ничего не отправляет (`src/lib/monitoring.ts`). В событиях нет персональных данных (`src/shared/scrub.ts`, список в `docs/store/DATA_SAFETY.md`).

**Как собирается сейчас.** В `app.json` подключён плагин `@sentry/react-native/expo`, в `metro.config.js` — `getSentryExpoConfig`. Автозагрузка sourcemaps и символов при сборке **выключена**: в каждом профиле `eas.json` задано `SENTRY_DISABLE_AUTO_UPLOAD=true` (без токена iOS-сборка иначе падает на шаге загрузки, а на Android Gradle-плагин пытается загрузить маппинги). Проверено: `expo export` для iOS и Android проходит без `SENTRY_AUTH_TOKEN` и даже без сети.

**Как включить позже** (когда есть проект в Sentry):
1. В проекте Sentry: «Prevent Storing of IP Addresses» включить, регион данных (EU или US) выбрать при создании и отразить в политике конфиденциальности.
2. Токен и данные проекта хранить только в секретах EAS, не в репозитории: `eas env:create --name SENTRY_AUTH_TOKEN --value <токен> --visibility secret --environment production` (так же `--environment preview`), затем `SENTRY_ORG` и `SENTRY_PROJECT` (slug организации и проекта; это не секреты, но они нужны sentry-cli) и `EXPO_PUBLIC_SENTRY_DSN` (видимость `plaintext` или `sensitive`: DSN попадает в приложение, это не секрет). Синтаксис команды `eas env:create` и значения `--visibility` сверить с `eas env:create --help`: он менялся между версиями EAS CLI.
3. Убрать `SENTRY_DISABLE_AUTO_UPLOAD` из нужных профилей `eas.json` (или переопределить значением `false` в окружении EAS).
4. Собрать приложение и проверить в Sentry, что событие приходит с читаемым стеком и в нём нет данных пользователя (`beforeSend` чистит их, но проверить глазами).
5. Токен хранить по принципу минимальных прав: создать отдельный Internal Integration с правами на загрузку релизов и sourcemaps (`project:releases`, `org:read`), не личный токен.

Не проверено: реальная нативная сборка с загрузкой (нужны аккаунт Sentry и токен), поведение шага iOS без токена (по скриптам плагина с `SENTRY_DISABLE_AUTO_UPLOAD=true` он пропускается).

## Что делать дальше

1. Перенести вход: логин, двухфакторная проверка, проверка возраста.
2. Перенести ленту и профиль.
3. Перенести сообщения, группы, уведомления.
4. Настроить push-уведомления через Expo.
5. Настроить сборки через EAS и подготовить иконки и splash-экран.

Документация Expo SDK 57: https://docs.expo.dev

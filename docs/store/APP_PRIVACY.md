# Apple: «App Privacy» (метки конфиденциальности), черновик

Основа та же, что в DATA_SAFETY.md: только то, что приложение реально собирает. Данные уходят на сервер Bloomly и в службу push Expo. **Tracking (отслеживание): нет** — рекламных SDK и сопоставления данных с чужими нет, App Tracking Transparency не нужен.

Во всех строках ниже данные **связаны с пользователем** (Linked to You), потому что привязаны к аккаунту.

| Категория Apple | Тип данных | Что именно | Цели |
|---|---|---|---|
| Contact Info | Email Address | email аккаунта | App Functionality |
| Contact Info | Name | отображаемое имя и username (публичны) | App Functionality |
| Identifiers | User ID | id аккаунта | App Functionality |
| Identifiers | Device ID | Expo push-токен (если разрешены уведомления) и случайный uuid устройства `X-Device-Id` (не рекламный идентификатор, не используется для отслеживания) | App Functionality |
| User Content | Photos or Videos | фото и видео, которые пользователь прикладывает к посту | App Functionality |
| User Content | Audio Data | голосовые сообщения | App Functionality |
| User Content | Other User Content | посты, комментарии, сообщения, жалобы | App Functionality |
| Usage Data | Product Interaction | просмотры постов, оценки, подписки (лента «Для вас») | Product Personalization, App Functionality |
| Other Data | Other Data Types | дата рождения, email родителя (13–15 лет), отметки согласий, симпатии профиля | App Functionality (проверка возраста, соблюдение закона) |

## Если сборка уходит с включённым Sentry (задан `EXPO_PUBLIC_SENTRY_DSN`)

Добавить строку: **Diagnostics → Crash Data** (и «Other Diagnostic Data», если выбранные поля этого требуют: модель устройства, версия ОС, версия приложения, цепочка экранов). **Not Linked to You**: пользователь в событиях не задан, токены, почта и id вычищены (`src/shared/scrub.ts`). Цель: App Functionality. Tracking: нет. Performance Data не собирается (трассировки выключены). Без DSN строка не нужна: SDK ничего не отправляет.

## Не собираются

Location, Contacts, Health & Fitness, Financial Info, Browsing History, Search History, Performance Data, Purchases (покупок в приложении нет), Advertising Data, Sensitive Info как отдельная категория.

## Оговорки

- Push-токен обрабатывает Expo и системные службы доставки (APNs, FCM) как процессоры доставки: на метку это не влияет, в политике конфиденциальности это стоит указать.
- Сервер сохраняет IP и название устройства в записи сессии (безопасность, управление входом); сверить с политикой.
- Описание метки «Other User Content» включает контент 18+, который пользователи публикуют сами; он скрыт по умолчанию (см. AGE_RATING.md).
- Ссылка на политику конфиденциальности (обязательна): https://bloomly.fun/privacy.

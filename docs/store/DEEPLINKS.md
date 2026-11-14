# Универсальные ссылки и App Links для https://bloomly.fun

Приложение открывает по ссылкам `https://bloomly.fun/...` только четыре раздела:

| Ссылка | Экран приложения |
|---|---|
| `/post/<id>` | пост |
| `/profile/<username>` | профиль |
| `/groups/<id или slug>` | группа |
| `/events/<id>` | событие |

Остальные адреса сайта (в том числе `/groups/<slug>/dashboard` и прочая внутренняя часть) остаются в браузере: у Android они не попадают в фильтр, а `app/+native-intent.tsx` на всякий случай переводит неизвестное на главную. Схема `bloomly://post/<id>` (и profile, groups, events) работает без серверной настройки. Незалогиненный пользователь после открытия ссылки попадает на экран входа, сама ссылка при этом не запоминается.

В приложении уже настроено (`app.json`): `ios.associatedDomains = ["applinks:bloomly.fun"]` и `android.intentFilters` с `autoVerify: true` для `https://bloomly.fun` и префиксов `/post`, `/profile`, `/groups`, `/events`. Идентификаторы: iOS Bundle ID и Android package — `app.bloomly.mobile`. Чтобы ссылки заработали, **на сервере нужно разместить два файла**. Ниже их точное содержимое, значения в угловых скобках подставляет владелец аккаунтов: настоящих значений в репозитории нет.

## iOS: `apple-app-site-association`

Адрес: `https://bloomly.fun/.well-known/apple-app-site-association` (без расширения и без редиректов; допустим и `https://bloomly.fun/apple-app-site-association`, но достаточно первого). `Content-Type: application/json`. Файл не подписывается.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<APPLE_TEAM_ID>.app.bloomly.mobile"],
        "components": [
          { "/": "/post/*" },
          { "/": "/profile/*" },
          { "/": "/groups/*" },
          { "/": "/events/*" }
        ]
      }
    ]
  }
}
```

- `<APPLE_TEAM_ID>` — Team ID из Apple Developer (Membership), 10 символов, например форма `ABCDE12345` (это пример формата, не значение).
- Нужен включённый Associated Domains у App ID `app.bloomly.mobile` (Expo/EAS включит возможность при сборке, если capability разрешена в аккаунте).
- Проверка после выкладки: `curl -sI https://bloomly.fun/.well-known/apple-app-site-association` (ожидается 200 и `application/json`), затем проверка через Apple CDN: `https://app-site-association.cdn-apple.com/a/v1/bloomly.fun`.

## Android: `assetlinks.json`

Адрес: `https://bloomly.fun/.well-known/assetlinks.json`, `Content-Type: application/json`.

**Файл на сервере уже есть** (`deploy/nginx/bloomly.conf`, блок `location = /.well-known/assetlinks.json`), и в нём указан другой пакет `fun.bloomly.app.online`. Его нужно **не заменить, а дополнить**: оставить существующий объект и добавить второй для `app.bloomly.mobile`. Итоговый массив:

```json
[
  { "...": "существующий объект для fun.bloomly.app.online остаётся без изменений" },
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.bloomly.mobile",
      "sha256_cert_fingerprints": ["<SHA256_CERT_FINGERPRINT>"]
    }
  }
]
```

- `<SHA256_CERT_FINGERPRINT>` — отпечаток SHA-256 сертификата, которым подписывается **релизная** сборка. Формат: 32 пары hex через двоеточие, например `AA:BB:...:FF` (формат, не значение). Где взять:
  - Google Play App Signing (рекомендуется): Play Console → Приложение → Настройка → Целостность приложения → Подпись приложения → «Сертификат ключа подписи приложения» → SHA-256. Именно он нужен, а не ключ загрузки.
  - Свой keystore: `keytool -list -v -keystore <keystore> -alias <alias>`.
  - Для отладочных и внутренних сборок EAS отпечаток другой: при необходимости добавить в тот же массив `sha256_cert_fingerprints` второй элемент.
- Если файл отдаётся из nginx строкой `return 200 '...'`, обновить её (одна строка JSON) и перезагрузить nginx. Файл должен отдаваться без редиректов и без авторизации.
- Проверка: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://bloomly.fun&relation=delegate_permission/common.handle_all_urls` — в ответе должны быть оба пакета. На устройстве: `adb shell pm get-app-links app.bloomly.mobile` (статус `verified`).

## Что проверить на устройстве после выкладки

- [ ] Нажатие на `https://bloomly.fun/post/<id>` в заметках или мессенджере открывает приложение (iOS и Android), а не браузер.
- [ ] Нажатие на `https://bloomly.fun/groups/<slug>/dashboard` открывает браузер.
- [ ] Ссылка при незалогиненном пользователе ведёт на экран входа.
- [ ] Возврат OAuth `bloomly://auth/callback` по-прежнему работает.

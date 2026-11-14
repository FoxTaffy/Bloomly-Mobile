# Аудит перед отправкой в магазины (Phase 6)

Режим «только отчёт», кроме тривиального. Все выводы по реальным проверкам: `expo-doctor`, `expo export`, генерация нативных проектов `expo prebuild --no-install` во временной копии (репозиторий не засорялся), чтение манифестов пакетов, `npm audit`, поиск по коду.

## Результаты проверок

| Проверка | Результат |
|---|---|
| `npx expo-doctor` | 21/21, замечаний нет (одно предупреждение плагина Sentry: не заданы organization и project, они берутся из переменных окружения при сборке) |
| `npx expo export` iOS и Android | проходят, в том числе без `SENTRY_AUTH_TOKEN` и без сети (`unshare -n`): загрузка в Sentry не вызывается |
| `npm run check` (tsc и правила) | зелёный |
| `console.*` в `app/` и `src/` | нет ни одного вызова (токены и персональные данные в логи не попадают) |
| `http://` в коде и конфигах | нет |
| `TODO`, `FIXME`, `XXX`, `HACK` | нет |
| `npm audit --omit=dev` | было 14 (1 critical, 7 high, 6 moderate), после безопасного `npm audit fix` стало **6 (3 high, 3 moderate)**, critical нет |

## Разрешения Android (итоговые)

Список главного манифеста взят из `prebuild`; разрешения из манифестов библиотек добавляются при сборке Gradle (взяты из файлов пакетов, итоговый merged-манифест не собирался).

| Разрешение | Откуда | Где используется в коде | Вывод |
|---|---|---|---|
| `INTERNET` | RN, expo-file-system, expo-video | все запросы к API, WebView | нужно |
| `RECORD_AUDIO` | expo-audio | запись голосового сообщения `app/messages/[id].tsx` | нужно, **но сейчас заблокировано `tools:node="remove"`: см. находку 1** |
| `CAMERA` | expo-image-picker (манифест библиотеки) | съёмка фото `usePostMedia.takeWithCamera` | нужно |
| `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` | expo-notifications | push-уведомления; прочие системные задачи уведомлений | нужно |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (оба `maxSdkVersion=32`) | expo-image-picker, expo-file-system | выбор медиа из галереи, чтение файла частями при загрузке | допустимо: ограничены Android 12 и ниже |
| `MODIFY_AUDIO_SETTINGS` | expo-audio | запись звука | допустимо (обычное разрешение) |
| `VIBRATE` | шаблон RN | в коде вибрации нет | обычное разрешение, пользователю не показывается |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | плагин expo-audio (по умолчанию включено фоновое воспроизведение) | **нет**: в приложении нет проигрывателя звука или видео | лишнее, Play потребует декларацию; **находка 2** |
| `SYSTEM_ALERT_WINDOW` | базовый манифест Expo | нет | лишнее в релизе; **находка 4** |

Остальное в манифесте: фильтр `bloomly://`, фильтр App Links `https://bloomly.fun` с `autoVerify` для `/post`, `/profile`, `/groups`, `/events`, `allowBackup=true` с правилами исключения для SecureStore, `enableOnBackInvokedCallback=false`.

## Разрешения и строки iOS (итоговые)

| Ключ или настройка | Значение | Где используется | Вывод |
|---|---|---|---|
| `NSPhotoLibraryUsageDescription` | «Bloomly обращается к вашей галерее, чтобы вы могли выбрать фото и видео для публикации в посте.» | `pickFromLibrary` | нужно, формулировка честная |
| `NSCameraUsageDescription` | «Bloomly использует камеру, чтобы вы могли сделать фото для публикации в посте.» | `takeWithCamera` (только фото) | нужно |
| `NSMicrophoneUsageDescription` | **отсутствует** | запись голосового сообщения | **ошибка, находка 1:** без строки iOS завершает приложение при обращении к микрофону |
| `NSFaceIDUsageDescription` | «Allow $(PRODUCT_NAME) to access your Face ID biometric data.» (английский по умолчанию, плагин expo-secure-store) | Face ID не используется | лишняя строка, может вызвать вопрос рецензента; **находка 3** |
| `UIBackgroundModes` | `audio` | фонового звука нет | рецензент Apple может отклонить (раздел 2.5.4 правил); **находка 2** |
| `NSAppTransportSecurity` | `NSAllowsArbitraryLoads=false`, `NSAllowsLocalNetworking=true` | только https | хорошо (локальная сеть разрешена шаблоном Expo для разработки) |
| `CFBundleURLSchemes` | `bloomly`, `app.bloomly.mobile` | возврат OAuth, ссылки | нужно |
| Entitlements | `applinks:bloomly.fun`, `aps-environment=development` | универсальные ссылки, push | значение `development` в проекте: что подставит подпись для App Store (`production`), на сборке не проверено |
| `TARGETED_DEVICE_FAMILY` | 1 (iPhone) | `supportsTablet: false` | как решено |
| `UIUserInterfaceStyle` | Dark | приложение только тёмное | как решено |

## Находки

1. **Ошибка (регрессия Phase 4), нужна правка `app.json`.** В блоке `expo-image-picker` стоит `"microphonePermission": false`. Плагин в этом случае (а) удаляет `NSMicrophoneUsageDescription` из iOS и (б) блокирует `RECORD_AUDIO` в Android (`tools:node="remove"`), перекрывая настройки `expo-audio`. **Голосовые сообщения не заработают на обеих платформах** (на iOS приложение закроется при запросе микрофона). Исправление в одну строку: заменить `false` на ту же строку, что у `expo-audio`: `"microphonePermission": "Bloomly использует микрофон для записи голосовых сообщений в чате."`. В этой фазе правка не внесена, потому что правила Phase 6 разрешают менять в `app.json` только сплэш, планшет и Sentry; попытка внести её была отклонена, ждёт вашего «да».
2. **Лишнее фоновое воспроизведение.** У плагина `expo-audio` по умолчанию `enableBackgroundPlayback: true`: из-за этого появились `UIBackgroundModes: audio` и два разрешения `FOREGROUND_SERVICE*`, а проигрывателя в приложении нет (голосовые сообщения только записываются и отправляются, воспроизведения нет). Исправление: в блоке `expo-audio` добавить `"enableBackgroundPlayback": false`. Требует вашего «да» (то же ограничение `app.json`).
3. **Face ID.** Плагин `expo-secure-store` по умолчанию добавляет английскую строку Face ID, а биометрия не используется. Исправление: `["expo-secure-store", { "faceIDPermission": false }]`. Требует вашего «да».
4. **`SYSTEM_ALERT_WINDOW`** попадает в релизный манифест из базового шаблона Expo. Исправление: `android.blockedPermissions: ["android.permission.SYSTEM_ALERT_WINDOW"]` в `app.json`. Требует вашего «да».
5. **Неиспользуемая зависимость `expo-video`:** ни одного импорта в `app/` и `src/`, но плагин в `app.json` и пакет в `package.json`. Удаление пакета меняет `package-lock.json` (через `npm uninstall`, не вручную) и убирает плагин из `app.json`; вместе с п. 2 не нужно ни одного фонового разрешения. Не удалял.
6. **Уязвимости, оставшиеся после `npm audit fix` (6):**
   - `expo-router` → `query-string` → `decode-uri-component` (high; `expo-router`, `query-string`, `decode-uri-component`): отказ в обслуживании при разборе специально составленного адреса с запросом. Попадает в приложение (разбор ссылок), но последствие — зависание приложения на устройстве владельца, данные не раскрываются; исправление только в `expo-router` 58, то есть с переходом на SDK 58. Требует решения о миграции SDK.
   - `expo` → `@expo/fingerprint` → `minimatch` (moderate, 3 записи): инструменты командной строки Expo, **в бандл приложения не попадают**; npm предлагает «исправление» откатом до SDK 52, что неприемлемо.
   - Исправленные: `axios` (теперь 1.21.1; уязвимость в адаптере fetch, в приложении используется XHR-адаптер), `shell-quote`, `follow-redirects`, `postcss` и другие инструменты сборки.
7. **Прочее:** `NSAllowsLocalNetworking` и `VIBRATE` — стандартные значения шаблона, безвредны. Токены только в SecureStore и памяти, адреса https (проверяет `npm run check`).

## Не проверено

- итоговый merged-манифест Android и подписанный iOS-проект (нативные сборки не запускались: нужны EAS и аккаунты);
- значение `aps-environment` в подписанной сборке;
- запрос разрешений на устройстве (камера, фото, микрофон, уведомления);
- поведение приложения после исправления находок 1–4.

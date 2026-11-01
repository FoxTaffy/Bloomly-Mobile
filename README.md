<div align="center">

# 🌸 Bloomly Mobile

**Мобильное приложение соцсети Bloomly**

![Expo](https://img.shields.io/badge/Expo-58-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![NativeWind](https://img.shields.io/badge/NativeWind-4-4C67CF)
![Platforms](https://img.shields.io/badge/iOS%20%7C%20Android-supported-31458F)

</div>

---

## О проекте

Bloomly — соцсеть, у которой есть веб-версия и бэкенд (отдельный репозиторий). Этот репозиторий — мобильный клиент на Expo.

> **Статус:** каркас. Настроены навигация, шрифт, тёмная тема и сборка; экраны будут добавляться поверх.

## Стек

| Область | Технологии |
|---|---|
| Фреймворк | [Expo](https://expo.dev) 58, React Native 0.88, React 19 |
| Навигация | [Expo Router](https://docs.expo.dev/router/introduction/) (файловая маршрутизация) |
| Стили | [NativeWind](https://www.nativewind.dev) 4 + Tailwind CSS 3 |
| Данные | TanStack Query, Axios |
| Состояние | Zustand |
| Хранилище | AsyncStorage, Expo SecureStore (токены) |
| Анимации | Reanimated 4, Worklets |
| Графика | expo-image, react-native-svg |
| Язык | TypeScript |

## Быстрый старт

Нужны Node.js и [Expo Go](https://expo.dev/go) на телефоне либо эмулятор Android / симулятор iOS.

```bash
npm install
npm start          # dev-сервер, QR-код для Expo Go
```

| Команда | Что делает |
|---|---|
| `npm start` | Запускает dev-сервер Expo |
| `npm run android` | Запуск на Android |
| `npm run ios` | Запуск на iOS (только macOS) |
| `npm run typecheck` | Проверка типов (`tsc --noEmit`) |
| `npm run build:android` | Экспорт Android-бандла |

## Структура

```
mobile/
├── app/                 # экраны и роутинг (Expo Router)
│   ├── _layout.tsx      # корневой layout
│   └── index.tsx        # главный экран
├── app.json             # конфиг Expo (имя, схема, иконки, плагины)
├── global.css           # директивы Tailwind для NativeWind
├── tailwind.config.js   # токены дизайна
├── babel.config.js
├── metro.config.js
└── tsconfig.json
```

## Дизайн

Приложение тёмное (`userInterfaceStyle: dark`), шрифт — **Nunito**. Палитра и правила — в [brand-guide](../docs/brand-guide.md) основного репозитория; цвета вне палитры гайда не вводятся.

| Роль | HEX |
|---|---|
| Фон | `#16192F` |
| Фон блока | `#1F223C` |
| Рамка блока | `#2A2D45` |
| Акцент | `#4C67CF` |
| Off-White | `#F9FAFD` |

## Идентификаторы приложения

- Схема deep link: `bloomly://`
- iOS bundle id и Android package: `app.bloomly.mobile`

## Связанные проекты

- **Веб-версия и бэкенд** (Vue 3, Fastify, Prisma, PostgreSQL) — отдельный репозиторий Bloomly.

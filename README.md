# WebAR — Задание 5: управление объектом, HDRI, PBR (Three.js)

AR-сцена на Three.js + WebXR (hit-test). Объект ставится на пол тапом по экрану,
управляется HTML-панелью, освещается HDRI и использует PBR-материалы (glTF).

## Что умеет

- **Модель** — переключение между 4 glTF-моделями (GLTFLoader), изменение размера.
- **Цвет** — готовые цвета, ползунок оттенка, «Оригинал» (`material.color.set(...)`).
- **Поворот** — кнопки ±15°, авто-вращение (`rotation.y += delta`), скорость.
- **Материал** — ползунки roughness / metalness (PBR, `MeshStandardMaterial`).
- **Свет** — смена HDRI (`scene.environment`), экспозиция, фон HDRI (вне AR).
- В AR интерфейс остаётся поверх камеры через WebXR **DOM Overlay**, а нажатия по
  панели не считаются тапом по сцене (`beforexrselect`).

## Структура проекта

```
index.html              разметка и HTML-интерфейс
css/style.css           стили панели
js/main.js              точка входа, связывает модули через EventBus
js/config.js            списки моделей, HDRI, цветов
js/core/EventBus.js     шина событий
js/core/SceneManager.js рендерер, камера, свет и тень, главный цикл
js/core/EnvironmentManager.js  HDRI → scene.environment (PMREM)
js/core/ModelLoader.js  загрузка и подготовка glTF
js/core/ObjectController.js    цвет, вращение, масштаб, материал, замена модели
js/core/ARManager.js    AR-сессия, DOM Overlay, hit-test, reticle
js/core/InputHandler.js тап в AR, защита интерфейса, горячие клавиши
js/ui/UIManager.js      HTML-интерфейс (кнопки, ползунки, вкладки)
libs/three/             Three.js r160 (локально, без CDN)
assets/models/          модели .glb
assets/hdri/            HDRI .hdr
```

## Публикация на GitHub Pages

1. Создайте публичный репозиторий (например, `Task5-WebAR`).
2. Загрузите **содержимое** этой папки в корень репозитория
   (`Add file → Upload files`, перетащите всё, включая папки `js`, `libs`, `assets`, `css`).
3. `Settings → Pages → Build and deployment`: Source — *Deploy from a branch*,
   Branch — `main`, папка `/ (root)` → Save.
4. Через 1–2 минуты сайт будет доступен по адресу
   `https://<ваш-логин>.github.io/<имя-репозитория>/`.

## Запуск на Android

1. Нужен Chrome и «Службы Google Play для AR» (ARCore).
2. Откройте ссылку, нажмите **«Запустить AR»**, разрешите камеру.
3. Медленно поводите камерой над полом, пока не появится белое кольцо, и коснитесь экрана.
4. Тап по другой точке пола переносит объект. Кнопка «Меню» сворачивает панель.

## Проверка на компьютере

ES-модули не работают с `file://`, поэтому нужен локальный сервер:

```
python -m http.server 8000
```

Откройте `http://localhost:8000`. Мышь вращает камеру, стрелки ← → поворачивают объект, `R` — авто-вращение.

## Источники ресурсов

- Three.js r160 — MIT.
- Модели: Khronos glTF Sample Models (DamagedHelmet, WaterBottle, BoomBox, Avocado).
  Текстуры уменьшены до 1024/512 px и сжаты в WebP.
- HDRI: Royal Esplanade и Venice Sunset — из каталога примеров Three.js, использованы в учебных целях.

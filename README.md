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

## Источники ресурсов

- Three.js r160 — MIT.
- Модели: Khronos glTF Sample Models (DamagedHelmet, WaterBottle, BoomBox, Avocado).
  Текстуры уменьшены до 1024/512 px и сжаты в WebP.
- HDRI: Royal Esplanade и Venice Sunset — из каталога примеров Three.js, использованы в учебных целях.

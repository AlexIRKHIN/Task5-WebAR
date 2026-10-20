import { MODELS, ENVIRONMENTS, COLOR_PRESETS, DEFAULTS } from './config.js';
import { EventBus } from './core/EventBus.js';
import { SceneManager } from './core/SceneManager.js';
import { EnvironmentManager } from './core/EnvironmentManager.js';
import { ModelLoader } from './core/ModelLoader.js';
import { ObjectController } from './core/ObjectController.js';
import { ARManager } from './core/ARManager.js';
import { InputHandler } from './core/InputHandler.js';
import { UIManager } from './ui/UIManager.js';

/**
 * Точка входа: создаёт модули и связывает их через шину событий.
 */
const bus = new EventBus();

const sceneManager = new SceneManager(document.getElementById('app'));
const environment = new EnvironmentManager(sceneManager.renderer, sceneManager.scene);
const modelLoader = new ModelLoader();
const object = new ObjectController(sceneManager.stage, modelLoader, bus);
const ar = new ARManager(sceneManager.renderer, sceneManager.scene, bus, document.getElementById('overlay'));
const input = new InputHandler(sceneManager.renderer, sceneManager.scene, bus, DEFAULTS.rotateStep);
const ui = new UIManager(bus, {
    models: MODELS,
    environments: ENVIRONMENTS,
    colors: COLOR_PRESETS,
    defaults: DEFAULTS
});

input.shield(ui.interactive);
ui.init(DEFAULTS);
object.setAutoRotateSpeed(DEFAULTS.autoRotateSpeed);
environment.setExposure(DEFAULTS.exposure);

// Покадровое обновление
sceneManager.addUpdater((dt, frame) => {
    object.update(dt);
    ar.update(frame);
});

// ---------- Замена модели и окружения ----------

async function switchModel(id) {
    const def = MODELS.find((m) => m.id === id);
    if (!def) return;
    try {
        await object.setModel(def);
    } catch (err) {
        console.error(err);
        bus.emit('status', { text: 'Не удалось загрузить модель «' + def.name + '»', kind: 'error' });
    }
}

async function switchEnvironment(id) {
    const def = ENVIRONMENTS.find((e) => e.id === id);
    if (!def) return;
    try {
        await environment.set(def);
    } catch (err) {
        console.error(err);
        bus.emit('status', { text: 'Не удалось загрузить HDRI «' + def.name + '»', kind: 'error' });
    }
}

// ---------- Обработка событий интерфейса ----------

bus.on('ui:ar-toggle', () => ar.toggle());

bus.on('ui:model', switchModel);
bus.on('ui:env', switchEnvironment);

bus.on('ui:color', (value) => object.setColor(value));
bus.on('ui:roughness', (v) => object.setRoughness(v));
bus.on('ui:metalness', (v) => object.setMetalness(v));
bus.on('ui:material-reset', () => object.resetMaterials());

bus.on('ui:rotate', (deg) => object.rotateBy(deg));
bus.on('ui:reset-angle', () => object.resetRotation());
bus.on('ui:autorotate', (on) => object.setAutoRotate(on));
bus.on('ui:rotate-speed', (v) => object.setAutoRotateSpeed(v));
bus.on('ui:scale', (k) => object.setScale(k));

bus.on('ui:exposure', (v) => environment.setExposure(v));
bus.on('ui:background', (on) => environment.setBackgroundVisible(on));

// Горячие клавиши (компьютер)
bus.on('input:rotate', (deg) => object.rotateBy(deg));
bus.on('input:toggle-autorotate', () => object.toggleAutoRotate());

// ---------- AR ----------

// Тап по экрану в AR: переносим объект в точку под прицелом
bus.on('input:select', () => {
    if (!ar.active) return;
    const position = ar.getHitPosition();
    if (!position) {
        bus.emit('status', { text: 'Поверхность не найдена — медленно поводите камерой', kind: 'info' });
        return;
    }
    object.placeAt(position);
    bus.emit('ar:placed');
});

bus.on('ar:start', () => {
    sceneManager.enterXR();
    environment.setXRActive(true);   // фоном в AR служит камера
    object.setVisible(false);        // объект появится после первого тапа
});

bus.on('ar:end', () => {
    sceneManager.exitXR();
    environment.setXRActive(false);
    object.resetPlacement();
});

// ---------- Старт ----------

ar.checkSupport().then((result) => bus.emit('ar:support', result));

(async () => {
    await switchEnvironment(DEFAULTS.envId);
    await switchModel(DEFAULTS.modelId);
})();

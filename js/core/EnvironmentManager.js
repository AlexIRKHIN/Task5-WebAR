import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Освещение на основе изображения (IBL): загружает HDRI (.hdr), превращает его
 * в prefiltered environment map через PMREMGenerator и назначает scene.environment.
 * Именно эта карта даёт PBR-материалам реалистичные блики и отражения.
 */
export class EnvironmentManager {
    constructor(renderer, scene) {
        this.renderer = renderer;
        this.scene = scene;
        this.pmrem = new THREE.PMREMGenerator(renderer);
        this.pmrem.compileEquirectangularShader();
        this.rgbeLoader = new RGBELoader();
        this.cache = new Map();

        this.current = null;          // { envMap, background }
        this.showBackground = true;   // пользовательская настройка «Фон HDRI»
        this.xrActive = false;        // в AR фоном служит камера — фон сцены отключаем
    }

    async set(def) {
        let entry = this.cache.get(def.id);

        if (!entry) {
            if (def.type === 'room') {
                const envMap = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
                entry = { envMap, background: new THREE.Color(0x20242b), isTexture: false };
            } else {
                const hdr = await this.rgbeLoader.loadAsync(def.url);
                hdr.mapping = THREE.EquirectangularReflectionMapping;
                const envMap = this.pmrem.fromEquirectangular(hdr).texture;
                entry = { envMap, background: hdr, isTexture: true };
            }
            this.cache.set(def.id, entry);
        }

        this.current = entry;
        this.scene.environment = entry.envMap;   // <- освещение всех PBR-материалов
        this._applyBackground();
    }

    setExposure(value) {
        this.renderer.toneMappingExposure = value;
    }

    setBackgroundVisible(visible) {
        this.showBackground = visible;
        this._applyBackground();
    }

    setXRActive(active) {
        this.xrActive = active;
        this._applyBackground();
    }

    _applyBackground() {
        const visible = this.showBackground && !this.xrActive && this.current;
        this.scene.background = visible ? this.current.background : null;
        this.scene.backgroundBlurriness = this.current?.isTexture ? 0.15 : 0;
    }
}

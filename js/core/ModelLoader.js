import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Загрузка glTF/GLB. Каждая модель загружается один раз и кэшируется как
 * «шаблон»; при запросе выдаётся копия с собственными материалами, поэтому
 * изменение цвета одной копии не влияет на остальные.
 */
export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.templates = new Map();
    }

    async load(def) {
        let template = this.templates.get(def.id);
        if (!template) {
            const gltf = await this.loader.loadAsync(def.url);
            template = this._normalize(gltf.scene, def.size);
            this.templates.set(def.id, template);
        }
        return this._instantiate(template);
    }

    /** Масштабируем до нужного размера, центрируем по X/Z и ставим «на пол» (y = 0) */
    _normalize(object, targetSize) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const scale = targetSize / Math.max(size.x, size.y, size.z);
        object.scale.multiplyScalar(scale);
        object.updateMatrixWorld(true);

        box.setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.x -= center.x;
        object.position.z -= center.z;
        object.position.y -= box.min.y;

        const wrapper = new THREE.Group();
        wrapper.add(object);
        return wrapper;
    }

    _instantiate(template) {
        const copy = template.clone(true);
        copy.traverse((node) => {
            if (!node.isMesh) return;
            node.material = Array.isArray(node.material)
                ? node.material.map((m) => m.clone())
                : node.material.clone();
            node.castShadow = true;
            node.receiveShadow = true;
        });
        return copy;
    }
}

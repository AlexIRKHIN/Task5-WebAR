import * as THREE from 'three';

/**
 * Управление объектом: замена модели, цвет, вращение, масштаб и параметры
 * PBR-материала (roughness / metalness).
 *
 * Иерархия:  stage → pivot (поворот и масштаб пользователя) → модель.
 */
export class ObjectController {
    constructor(stage, modelLoader, bus) {
        this.stage = stage;
        this.modelLoader = modelLoader;
        this.bus = bus;

        this.pivot = new THREE.Group();
        this.pivot.name = 'pivot';
        stage.add(this.pivot);

        this.object = null;
        this.def = null;
        this.materials = [];
        this.originals = new Map();

        this.autoRotate = false;
        this.autoRotateSpeed = 0.8;
        this._loadToken = 0;
    }

    // ---------- Замена модели ----------

    async setModel(def) {
        const token = ++this._loadToken;
        this.bus.emit('model:loading', def);

        const object = await this.modelLoader.load(def);
        if (token !== this._loadToken) {          // пользователь уже выбрал другую модель
            this._disposeObject(object);
            return;
        }

        this._disposeObject(this.object);
        this.pivot.add(object);
        this.object = object;
        this.def = def;
        this._collectMaterials(object);

        this.bus.emit('model:ready', { def, material: this.getMaterialInfo() });
    }

    _collectMaterials(object) {
        this.materials = [];
        this.originals.clear();
        object.traverse((node) => {
            if (!node.isMesh) return;
            const list = Array.isArray(node.material) ? node.material : [node.material];
            for (const m of list) {
                if (!m.isMeshStandardMaterial || this.originals.has(m)) continue;
                this.materials.push(m);
                this.originals.set(m, {
                    color: m.color.clone(),
                    roughness: m.roughness,
                    metalness: m.metalness
                });
            }
        });
    }

    _disposeObject(object) {
        if (!object) return;
        object.removeFromParent();
        object.traverse((node) => {
            if (!node.isMesh) return;
            const list = Array.isArray(node.material) ? node.material : [node.material];
            list.forEach((m) => m.dispose());   // геометрия и текстуры общие с кэшем — не трогаем
        });
    }

    // ---------- Цвет ----------

    /** value — любая строка цвета CSS ('#ff0000', 'hsl(...)') или null для исходного цвета */
    setColor(value) {
        for (const m of this.materials) {
            if (value == null) m.color.copy(this.originals.get(m).color);
            else m.color.set(value);
        }
    }

    // ---------- PBR-материал ----------

    getMaterialInfo() {
        const first = this.materials[0];
        if (!first) return { roughness: 1, metalness: 0 };
        const o = this.originals.get(first);
        return { roughness: o.roughness, metalness: o.metalness };
    }

    setRoughness(value) {
        for (const m of this.materials) m.roughness = value;
    }

    setMetalness(value) {
        for (const m of this.materials) m.metalness = value;
    }

    resetMaterials() {
        for (const m of this.materials) {
            const o = this.originals.get(m);
            m.color.copy(o.color);
            m.roughness = o.roughness;
            m.metalness = o.metalness;
        }
        this.bus.emit('material:reset', this.getMaterialInfo());
    }

    // ---------- Вращение и масштаб ----------

    rotateBy(degrees) {
        this.pivot.rotation.y += THREE.MathUtils.degToRad(degrees);
    }

    resetRotation() {
        this.pivot.rotation.y = 0;
    }

    setAutoRotate(enabled) {
        this.autoRotate = enabled;
        this.bus.emit('object:autorotate', enabled);
    }

    toggleAutoRotate() {
        this.setAutoRotate(!this.autoRotate);
    }

    setAutoRotateSpeed(value) {
        this.autoRotateSpeed = value;
    }

    setScale(k) {
        this.pivot.scale.setScalar(k);
    }

    update(dt) {
        if (this.autoRotate && this.object) {
            this.pivot.rotation.y += this.autoRotateSpeed * dt;   // rotation.y += delta
        }
    }

    // ---------- Положение в мире ----------

    placeAt(position) {
        this.stage.position.copy(position);
        this.stage.visible = true;
    }

    setVisible(visible) {
        this.stage.visible = visible;
    }

    resetPlacement() {
        this.stage.position.set(0, 0, 0);
        this.stage.visible = true;
    }
}

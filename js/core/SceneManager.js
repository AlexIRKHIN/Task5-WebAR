import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Отвечает за «каркас» сцены: рендерер, камера, управление камерой в обычном
 * режиме, главный цикл, свет с тенью и платформу stage, на которой стоит объект.
 */
export class SceneManager {
    constructor(container) {
        this.container = container;
        this.updaters = [];
        this.clock = new THREE.Clock();

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 50);
        this.camera.position.set(0.55, 0.45, 0.85);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.xr.enabled = true;
        container.appendChild(this.renderer.domElement);

        // Управление камерой работает только вне AR-сессии
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0.12, 0);
        this.controls.enableDamping = true;
        this.controls.minDistance = 0.3;
        this.controls.maxDistance = 3;
        this.controls.maxPolarAngle = Math.PI * 0.495;
        this.controls.update();

        // stage — «сцена в сцене»: в неё входят объект, свет, тень и сетка.
        // В AR при тапе мы просто переносим stage в точку hit-test.
        this.stage = new THREE.Group();
        this.stage.name = 'stage';
        this.scene.add(this.stage);
        this._createStageContent();

        this._savedCamera = null;
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));

        this.renderer.setAnimationLoop((time, frame) => this._onFrame(frame));
    }

    _createStageContent() {
        // Направленный свет, отбрасывающий тень (основное освещение даёт HDRI)
        this.keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
        this.keyLight.position.set(0.9, 2.0, 0.7);
        this.keyLight.castShadow = true;
        const shadow = this.keyLight.shadow;
        shadow.mapSize.set(1024, 1024);
        shadow.camera.near = 0.1;
        shadow.camera.far = 6;
        shadow.camera.left = -1;
        shadow.camera.right = 1;
        shadow.camera.top = 1;
        shadow.camera.bottom = -1;
        shadow.bias = -0.0004;
        shadow.normalBias = 0.005;
        this.stage.add(this.keyLight, this.keyLight.target);

        // Невидимая плоскость, на которую падает только тень (в AR — на реальный пол)
        this.shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2),
            new THREE.ShadowMaterial({ opacity: 0.35 })
        );
        this.shadowPlane.receiveShadow = true;
        this.stage.add(this.shadowPlane);

        // Сетка для ориентации — только в обычном режиме
        this.grid = new THREE.GridHelper(2, 20, 0x555b66, 0x2c3037);
        this.grid.position.y = 0.0005;
        this.stage.add(this.grid);
    }

    /** Добавить функцию, вызываемую каждый кадр: fn(dt, frame) */
    addUpdater(fn) {
        this.updaters.push(fn);
    }

    _onFrame(frame) {
        const dt = Math.min(this.clock.getDelta(), 0.1);
        if (!this.renderer.xr.isPresenting) this.controls.update();
        for (const fn of this.updaters) fn(dt, frame);
        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        if (this.renderer.xr.isPresenting) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /** Переход в AR: отключаем орбитальную камеру и сетку, запоминаем позу камеры */
    enterXR() {
        this._savedCamera = {
            position: this.camera.position.clone(),
            quaternion: this.camera.quaternion.clone()
        };
        this.controls.enabled = false;
        this.grid.visible = false;
    }

    /** Возврат в обычный режим */
    exitXR() {
        if (this._savedCamera) {
            this.camera.position.copy(this._savedCamera.position);
            this.camera.quaternion.copy(this._savedCamera.quaternion);
            this.camera.scale.set(1, 1, 1);
        }
        this.controls.enabled = true;
        this.grid.visible = true;
        this.controls.update();
        this.resize();
    }
}

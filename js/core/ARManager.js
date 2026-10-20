import * as THREE from 'three';

/**
 * AR-сессия WebXR: запуск/остановка immersive-ar, DOM Overlay для HTML-интерфейса,
 * hit-test и визуальный маркер (reticle).
 */
export class ARManager {
    constructor(renderer, scene, bus, overlayRoot) {
        this.renderer = renderer;
        this.bus = bus;
        this.overlayRoot = overlayRoot;

        this.session = null;
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.hasHit = false;

        // Кольцо-прицел, ложится на найденную поверхность
        this.reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.07, 0.09, 40).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
        );
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        scene.add(this.reticle);
    }

    get active() {
        return this.session !== null;
    }

    async checkSupport() {
        if (!('xr' in navigator)) {
            return { supported: false, reason: 'WebXR не поддерживается этим браузером' };
        }
        try {
            const ok = await navigator.xr.isSessionSupported('immersive-ar');
            return ok
                ? { supported: true }
                : { supported: false, reason: 'AR недоступен на этом устройстве' };
        } catch (err) {
            return { supported: false, reason: 'Не удалось проверить поддержку AR' };
        }
    }

    toggle() {
        return this.active ? this.end() : this.start();
    }

    async start() {
        if (this.session) return;
        try {
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['local-floor', 'dom-overlay'],
                domOverlay: { root: this.overlayRoot }   // HTML-интерфейс остаётся поверх камеры
            });

            const hasFloor = session.enabledFeatures?.includes('local-floor');
            this.renderer.xr.setReferenceSpaceType(hasFloor ? 'local-floor' : 'local');
            await this.renderer.xr.setSession(session);

            this.session = session;
            session.addEventListener('end', this._onEnd);

            this.bus.emit('ar:start', { overlay: Boolean(session.domOverlayState) });
        } catch (err) {
            console.error(err);
            this.bus.emit('status', { text: 'Не удалось запустить AR: ' + err.message, kind: 'error' });
        }
    }

    async end() {
        if (this.session) await this.session.end();
    }

    _onEnd = () => {
        this.hitTestSource?.cancel();
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.hasHit = false;
        this.reticle.visible = false;
        this.session = null;
        this.bus.emit('ar:end');
    };

    /** Вызывается каждый кадр: обновляет результат hit-test и положение маркера */
    update(frame) {
        if (!this.session || !frame) return;

        const referenceSpace = this.renderer.xr.getReferenceSpace();

        if (!this.hitTestSourceRequested) {
            this.hitTestSourceRequested = true;
            this.session.requestReferenceSpace('viewer')
                .then((viewerSpace) => this.session.requestHitTestSource({ space: viewerSpace }))
                .then((source) => { this.hitTestSource = source; })
                .catch((err) => console.error('hit-test недоступен:', err));
        }

        if (!this.hitTestSource) return;

        const results = frame.getHitTestResults(this.hitTestSource);
        if (results.length > 0) {
            const pose = results[0].getPose(referenceSpace);
            this.reticle.visible = true;
            this.reticle.matrix.fromArray(pose.transform.matrix);
            this.hasHit = true;
        } else {
            this.reticle.visible = false;
            this.hasHit = false;
        }
    }

    /** Точка на поверхности под прицелом или null, если поверхность не найдена */
    getHitPosition() {
        if (!this.hasHit) return null;
        return new THREE.Vector3().setFromMatrixPosition(this.reticle.matrix);
    }
}

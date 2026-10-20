/**
 * Обработка пользовательского ввода:
 *  - тап по экрану в AR (событие WebXR select),
 *  - защита HTML-интерфейса от «сквозных» нажатий (beforexrselect),
 *  - горячие клавиши в обычном режиме на компьютере.
 */
export class InputHandler {
    constructor(renderer, scene, bus, rotateStep = 15) {
        this.bus = bus;
        this.rotateStep = rotateStep;

        const controller = renderer.xr.getController(0);
        controller.addEventListener('select', () => this.bus.emit('input:select'));
        scene.add(controller);

        window.addEventListener('keydown', (e) => this._onKey(e));
    }

    /**
     * Без этого нажатие на кнопку интерфейса в AR одновременно считалось бы
     * тапом по сцене, и объект переставлялся бы под пальцем.
     */
    shield(elements) {
        for (const el of elements) {
            el.addEventListener('beforexrselect', (e) => e.preventDefault());
        }
    }

    _onKey(e) {
        if (e.target instanceof HTMLInputElement) return;   // не мешаем ползункам
        if (e.key === 'ArrowLeft') this.bus.emit('input:rotate', -this.rotateStep);
        else if (e.key === 'ArrowRight') this.bus.emit('input:rotate', this.rotateStep);
        else if (e.key === 'r' || e.key === 'R') this.bus.emit('input:toggle-autorotate');
    }
}

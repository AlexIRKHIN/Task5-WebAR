/**
 * HTML-интерфейс (кнопки, ползунки, вкладки). Сам ничего не знает о Three.js:
 * при действиях пользователя публикует события ui:* в шину, а состояние
 * обновляет по событиям от остальных модулей.
 */
export class UIManager {
    constructor(bus, { models, environments, colors, defaults }) {
        this.bus = bus;
        this.defaults = defaults;
        this.el = (id) => document.getElementById(id);
        this._statusTimer = null;

        this.interactive = [this.el('topbar'), this.el('panel')];

        this._buildChips(models, environments, colors);
        this._bindTabs();
        this._bindControls();
        this._listenBus();
    }

    // ---------- Построение элементов ----------

    _buildChips(models, environments, colors) {
        const modelBox = this.el('model-chips');
        for (const m of models) {
            modelBox.append(this._chip(m.name, m.id, () => this.bus.emit('ui:model', m.id)));
        }

        const envBox = this.el('env-chips');
        for (const e of environments) {
            envBox.append(this._chip(e.name, e.id, () => this.bus.emit('ui:env', e.id)));
        }

        const colorBox = this.el('color-swatches');
        const original = this._chip('Оригинал', 'original', () => this._pickColor(null, original));
        original.classList.add('active');
        colorBox.append(original);
        for (const c of colors) {
            const sw = document.createElement('button');
            sw.className = 'swatch';
            sw.title = c.name;
            sw.style.background = c.value;
            sw.addEventListener('click', () => this._pickColor(c.value, sw));
            colorBox.append(sw);
        }
    }

    _chip(label, id, onClick) {
        const b = document.createElement('button');
        b.className = 'chip';
        b.dataset.id = id;
        b.textContent = label;
        b.addEventListener('click', () => {
            this._setActive(b.parentElement, b);
            onClick();
        });
        return b;
    }

    _setActive(container, target) {
        container.querySelectorAll('.active').forEach((n) => n.classList.remove('active'));
        target?.classList.add('active');
    }

    _setActiveById(containerId, id) {
        const box = this.el(containerId);
        this._setActive(box, box.querySelector(`[data-id="${id}"]`));
    }

    _pickColor(value, node) {
        this._setActive(this.el('color-swatches'), node);
        this.bus.emit('ui:color', value);
    }

    // ---------- Привязка событий ----------

    _bindTabs() {
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach((btn) => btn.addEventListener('click', () => {
            buttons.forEach((b) => b.classList.toggle('active', b === btn));
            document.querySelectorAll('.tab-pane').forEach((p) => {
                p.classList.toggle('active', p.dataset.pane === btn.dataset.tab);
            });
        }));

        this.el('btn-menu').addEventListener('click', () => {
            const collapsed = this.el('panel').classList.toggle('collapsed');
            this.el('btn-menu').textContent = collapsed ? 'Меню ▴' : 'Меню ▾';
        });
    }

    _bindControls() {
        const slider = (id, valueId, eventName, format) => {
            const input = this.el(id);
            const label = this.el(valueId);
            input.addEventListener('input', () => {
                const v = parseFloat(input.value);
                label.textContent = format(v);
                this.bus.emit(eventName, v);
            });
        };

        this.el('btn-ar').addEventListener('click', () => this.bus.emit('ui:ar-toggle'));

        slider('scale', 'scale-val', 'ui:scale', (v) => Math.round(v * 100) + '%');
        slider('rot-speed', 'rot-speed-val', 'ui:rotate-speed', (v) => v.toFixed(1));
        slider('roughness', 'roughness-val', 'ui:roughness', (v) => v.toFixed(2));
        slider('metalness', 'metalness-val', 'ui:metalness', (v) => v.toFixed(2));
        slider('exposure', 'exposure-val', 'ui:exposure', (v) => v.toFixed(2));

        this.el('hue').addEventListener('input', (e) => {
            this._setActive(this.el('color-swatches'), null);
            this.bus.emit('ui:color', `hsl(${e.target.value}, 75%, 50%)`);
        });

        const step = this.defaults.rotateStep;
        this.el('rot-left').addEventListener('click', () => this.bus.emit('ui:rotate', -step));
        this.el('rot-right').addEventListener('click', () => this.bus.emit('ui:rotate', step));
        this.el('rot-reset').addEventListener('click', () => this.bus.emit('ui:reset-angle'));
        this.el('mat-reset').addEventListener('click', () => this.bus.emit('ui:material-reset'));

        this.el('auto-rotate').addEventListener('click', () => {
            const on = this.el('auto-rotate').getAttribute('aria-pressed') !== 'true';
            this.bus.emit('ui:autorotate', on);
        });

        this.el('bg-toggle').addEventListener('click', () => {
            const btn = this.el('bg-toggle');
            const on = btn.getAttribute('aria-pressed') !== 'true';
            btn.setAttribute('aria-pressed', String(on));
            btn.classList.toggle('active', on);
            this.bus.emit('ui:background', on);
        });
    }

    _listenBus() {
        this.bus.on('model:loading', () => this.showStatus('Загрузка модели…', 'info', 0));

        this.bus.on('model:ready', ({ def, material }) => {
            this.hideStatus();
            this._setActiveById('model-chips', def.id);
            this._syncMaterial(material);
            this._setActive(this.el('color-swatches'), this.el('color-swatches').firstElementChild);
        });

        this.bus.on('material:reset', (material) => {
            this._syncMaterial(material);
            this._setActive(this.el('color-swatches'), this.el('color-swatches').firstElementChild);
        });

        this.bus.on('object:autorotate', (on) => {
            const btn = this.el('auto-rotate');
            btn.setAttribute('aria-pressed', String(on));
            btn.classList.toggle('active', on);
        });

        this.bus.on('status', ({ text, kind }) => this.showStatus(text, kind));

        this.bus.on('ar:support', ({ supported, reason }) => {
            const btn = this.el('btn-ar');
            btn.disabled = !supported;
            btn.textContent = supported ? 'Запустить AR' : 'AR недоступен';
            if (!supported) this.showStatus(reason + '. Доступен обычный 3D-просмотр.', 'info', 6000);
        });

        this.bus.on('ar:start', ({ overlay }) => {
            document.body.classList.add('ar-active');
            const btn = this.el('btn-ar');
            btn.textContent = 'Выйти из AR';
            btn.classList.add('stop');
            this.setHint('Наведите камеру на пол и дождитесь белого кольца, затем коснитесь экрана');
            if (!overlay) {
                this.showStatus('Браузер не поддерживает DOM Overlay — панель в AR недоступна', 'error', 6000);
            }
        });

        this.bus.on('ar:placed', () => this.setHint('Тап по поверхности — переместить объект'));

        this.bus.on('ar:end', () => {
            document.body.classList.remove('ar-active');
            const btn = this.el('btn-ar');
            btn.textContent = 'Запустить AR';
            btn.classList.remove('stop');
            this.setHint('');
        });
    }

    _syncMaterial({ roughness, metalness }) {
        this._setSlider('roughness', 'roughness-val', roughness, 2);
        this._setSlider('metalness', 'metalness-val', metalness, 2);
    }

    _setSlider(id, valueId, value, digits) {
        this.el(id).value = value;
        this.el(valueId).textContent = Number(value).toFixed(digits);
    }

    /** Установить начальные значения элементов из конфигурации */
    init({ modelId, envId, exposure }) {
        this._setActiveById('model-chips', modelId);
        this._setActiveById('env-chips', envId);
        this._setSlider('exposure', 'exposure-val', exposure, 2);
        this.el('rot-speed').value = this.defaults.autoRotateSpeed;
        this.el('rot-speed-val').textContent = this.defaults.autoRotateSpeed.toFixed(1);
    }

    setHint(text) {
        this.el('hint').textContent = text;
    }

    /** ms = 0 — сообщение остаётся, пока его не скроют вручную */
    showStatus(text, kind = 'info', ms = 2800) {
        const box = this.el('status');
        clearTimeout(this._statusTimer);
        box.textContent = text;
        box.className = kind === 'error' ? 'error' : '';
        if (ms > 0) this._statusTimer = setTimeout(() => this.hideStatus(), ms);
    }

    hideStatus() {
        clearTimeout(this._statusTimer);
        this.el('status').textContent = '';
    }
}

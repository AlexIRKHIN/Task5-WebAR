// Конфигурация проекта: списки моделей, окружений и цветов.
// Чтобы добавить свою модель, достаточно дописать объект в MODELS.

export const MODELS = [
    // size — желаемый размер наибольшей стороны модели в метрах (для AR)
    { id: 'helmet',  name: 'Шлем',    url: 'assets/models/DamagedHelmet.glb', size: 0.30 },
    { id: 'bottle',  name: 'Бутылка', url: 'assets/models/WaterBottle.glb',   size: 0.28 },
    { id: 'boombox', name: 'Бумбокс', url: 'assets/models/BoomBox.glb',       size: 0.22 },
    { id: 'avocado', name: 'Авокадо', url: 'assets/models/Avocado.glb',       size: 0.12 }
];

export const ENVIRONMENTS = [
    { id: 'esplanade', name: 'Esplanade (HDRI)', type: 'hdr',  url: 'assets/hdri/royal_esplanade_1k.hdr' },
    { id: 'sunset',    name: 'Sunset (HDRI)',    type: 'hdr',  url: 'assets/hdri/venice_sunset_1k.hdr' },
    { id: 'studio',    name: 'Студия',           type: 'room' }   // процедурная environment map
];

export const COLOR_PRESETS = [
    { name: 'Красный',    value: '#e53935' },
    { name: 'Оранжевый',  value: '#fb8c00' },
    { name: 'Жёлтый',     value: '#fdd835' },
    { name: 'Зелёный',    value: '#43a047' },
    { name: 'Синий',      value: '#1e88e5' },
    { name: 'Фиолетовый', value: '#8e24aa' },
    { name: 'Белый',      value: '#ffffff' },
    { name: 'Чёрный',     value: '#222222' }
];

export const DEFAULTS = {
    modelId: 'helmet',
    envId: 'esplanade',
    exposure: 1.0,
    rotateStep: 15,        // шаг кнопок поворота, градусы
    autoRotateSpeed: 0.8   // рад/с
};

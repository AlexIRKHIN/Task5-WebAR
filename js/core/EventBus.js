// Простая шина событий (publish/subscribe).
// Модули не знают друг о друге и общаются только через события.

export class EventBus {
    constructor() {
        this.handlers = new Map();
    }

    on(event, handler) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        this.handlers.get(event)?.delete(handler);
    }

    emit(event, payload) {
        this.handlers.get(event)?.forEach((handler) => {
            try {
                handler(payload);
            } catch (err) {
                console.error(`Ошибка в обработчике события "${event}":`, err);
            }
        });
    }
}

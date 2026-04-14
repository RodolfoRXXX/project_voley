const { EventEmitter } = require("events");

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

function emitDomainEvent(type, payload) {
  emitter.emit(type, payload);
}

function onDomainEvent(type, handler) {
  emitter.on(type, async (payload) => {
    try {
      await handler(payload);
    } catch (error) {
      console.error("[DomainEventBus] handler failed", { type, error });
    }
  });
}

module.exports = {
  emitDomainEvent,
  onDomainEvent,
};

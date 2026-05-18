// Simple event emitter for cross-component communication
const events = {};

export const eventEmitter = {
  on: (event, callback) => {
    if (!events[event]) events[event] = [];
    events[event].push(callback);
    return () => {
      events[event] = events[event].filter(cb => cb !== callback);
    };
  },
  emit: (event, data) => {
    if (events[event]) {
      events[event].forEach(callback => callback(data));
    }
  }
};

// Predefined events
export const EVENTS = {
  TRANSACTION_CREATED: 'transaction:created',
  TRANSACTION_UPDATED: 'transaction:updated',
  TRANSACTION_DELETED: 'transaction:deleted',
  TRANSACTIONS_IMPORTED: 'transactions:imported',
};

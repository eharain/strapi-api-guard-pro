'use strict';

class Cache {
  constructor(ttl = 30000) {
    this.store = new Map();
    this.ttl = ttl;
  }
  
  set(key, value, ttl = this.ttl) {
    this.store.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }
  
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }
  
  has(key) {
    return this.get(key) !== null;
  }
  
  delete(key) {
    this.store.delete(key);
  }
  
  clear() {
    this.store.clear();
  }
  
  size() {
    return this.store.size;
  }
}

module.exports = Cache;

'use strict';

const _store = Symbol('store');
const _setAndUnlock = Symbol('setAndUnlock');
const lock = require('lock')();

class MemoryStorage{
    constructor(){
        this[_store] = new Map();
    }
    getAndLock(key, callback){
        const self = this;
        lock(key, function onLockAcquired(unlock){
            const value = self[_store].get(key);

            return setImmediate(callback, 
                null, 
                value,
                // bind is slow, revisit this
                self[_setAndUnlock].bind(self, unlock, key));
        });
    }
    [_setAndUnlock](unlock, key, value, callback){
        if (!callback){
            callback = value;
        } else {
            this[_store].set(key, value);    
        }

        return setImmediate(unlock(callback));
    }
}

module.exports = MemoryStorage;
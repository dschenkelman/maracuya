'use strict'

const _registry = Symbol('registry');

class Handlers {
    constructor(registry){
        this[_registry] = registry;
    }

    take(type, id, amount, callback){
        const bucket = this[_registry].get(type, id);

        if (!bucket){
            return setImmediate(callback, new Error(`Invalid bucket type ${type}`));
        }

        bucket.take(amount, callback);
    }
}

module.exports = Handlers;
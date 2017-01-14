'use strict';

const _storage = Symbol('storage');
const _identifier = Symbol('identifier');
const Joi = require('joi');

const paramsSchema = Joi.object().keys({
    identifier: Joi.string().max(100).required(),
    storage: Joi.object().keys({
        getAndLock: Joi.func().required(),
        setAndUnlock: Joi.func().required()
    }).required()
});


class TokenBucket {
    constructor(params){
        const result = Joi.validate(params, paramsSchema);
        if (result.error) { throw result.error; }
        
        this[_storage] = params.storage;
        this[_identifier] = params.identifier;
    }

    take(amount, callback){
        const storage = this[_storage];
        const id = this[_identifier];
        storage.getAndLock(id, function ongetAndLock(err, remaining){
            if (err) { return callback(err); }
            if (remaining >= amount){
                return storage.setAndUnlock(
                    id, 
                    remaining - amount,
                    function onRemoveTokens(err){
                        if (err) { return callback(err); }
                        callback(null, true);
                    });
            }

            return callback(null, false);            
        });
    }
}

module.exports = TokenBucket;
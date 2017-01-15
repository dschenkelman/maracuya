'use strict';

const BucketType = require('./bucket-type');

const _identifier = Symbol('identifier');
const _timestampProvider = Symbol('timestampProvider');
const _type = Symbol('type');
const Joi = require('joi');

const requiredPositiveInteger = Joi.number().integer().greater(0).required();

const paramsSchema = Joi.object().keys({
    // bucket identifier
    identifier: Joi.string().max(100).required(),
    // the bucket's type
    type: Joi.object().type(BucketType).required(),
    // timestamp provider, useful for mocking or in case we want to change the implementation
    timestampProvider: Joi.func().default(() => +new Date())
});

class BucketState {
    constructor(count, lastChange){
        this.count = count;
        this.lastChange = lastChange;
    }
}

class TokenBucket {
    constructor(params){
        if (!params) { throw new Error('"params" argument is required'); }
        const result = Joi.validate(params, paramsSchema);
        if (result.error) { throw result.error; }
        const value = result.value;
        
        this[_type] = value.type;
        this[_identifier] = value.identifier;
        this[_timestampProvider] = value.timestampProvider;
    }

    _mutateState(existingState, toTake, currentTimestamp){
        const lastChange = existingState.lastChange;
        const diff = Math.max(currentTimestamp - lastChange, 0);
        const toIncrease = diff * (this[_type].perInterval / this[_type].interval);
        const increased = Math.min(existingState.count + toIncrease, this[_type].capacity);

        return new BucketState(increased - toTake, currentTimestamp);
    }

    take(amount, callback){
        const self = this;
        
        const storage = this[_type].storage;
        
        const id = this[_identifier];
        storage.getAndLock(id, function onGetAndLock(err, state, setAndUnlock){
            if (err) { return callback(err); }

            const currentTimestamp = self[_timestampProvider]();

            if (!state){
                // if no bucket existed in storage, then this is the first time being used
                // create set it to initial state
                state = new BucketState(self[_type].capacity, currentTimestamp);
            }

            const newState = self._mutateState(state, amount, currentTimestamp);

            if (newState.count < 0){
                return setAndUnlock(id, function onErrorSetAndUnlock(err){
                    return callback(null, false);
                });
            }

            return setAndUnlock(
                id, 
                newState,
                function onSuccessSetAndUnlock(err){
                    if (err) { return callback(err); }
                    callback(null, true);
                }); 
        });
    }
}

module.exports = TokenBucket;
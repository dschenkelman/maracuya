'use strict';

const _storage = Symbol('storage');
const _identifier = Symbol('identifier');

class TokenBucket {
    constructor(identifier, storage){
        this[_storage] = storage;
        this[_identifier] = identifier;
    }

    take(amount, callback){
        const storage = this[_storage];
        const id = this[_identifier];
        storage.getTokens(id, function onGetTokens(err, remaining){
            if (err) { return callback(err); }
            if (remaining >= amount){
                return storage.updateTokensAndUnlock(
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
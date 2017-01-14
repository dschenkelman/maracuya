const expect = require('chai').expect;
const sinon = require('sinon');
const TokenBucket = require('../lib/token-bucket');

describe('token-bucket params', () => {
    const params = {
        storage: {
            getAndLock: () => {},
            setAndUnlock: () => {}
        },
        identifier: 'id',
        capacity: 10,
        perInterval: 1,
        interval: 1000
    };

    const patch = function(update){
        return Object.assign({}, params, update);
    };

    describe('identifier', () => {
        it('should fail if identifier is not present', () => {
            expect(() => new TokenBucket({})).to.throw('"identifier" is required');
        });

        it('should fail if identifier is not string', () => {
            expect(() => new TokenBucket(patch({ identifier: []})))
                .to.throw('"identifier" must be a string');
        });

        it('should fail if identifier is empty', () => {
            expect(() => new TokenBucket(patch({ identifier: ''}))).to.throw('"identifier" is not allowed to be empty');
        });
    });

    describe('storage', () => {
        it('shoud fail if storage is not present', () =>{
            expect(() => new TokenBucket({ identifier: 'valid' })).to.throw('"storage" is required');
        });

        it('shoud fail if storage is not object', () =>{
            expect(() => new TokenBucket(patch({ identifier: 'valid', storage: 1 }))).to.throw('"storage" must be an object');
        });

        it('shoud fail if storage does not have getAndLock', () =>{
            expect(() => new TokenBucket(patch({ 
                storage: {
                    setAndUnlock: () => {}
                }
            }))).to.throw('"getAndLock" is required');
        });

        it('shoud fail if storage does not have setAndUnlock', () =>{
            expect(() => new TokenBucket(patch({ 
                storage: {
                    getAndLock: () => {}
                },
                identifier: 'valid' 
            }))).to.throw('"setAndUnlock" is required');
        });
    });

    ['capacity', 'interval', 'perInterval'].forEach(param => {
        describe(param, () => {
            it('should fail if ${param} is not a number', () => {
                const update = {};
                update[param] = 'hello';
                expect(() => new TokenBucket(patch(update)))
                    .to.throw(`"${param}" must be a number`);
            });

            it('should fail if ${param} is not greater than 0', () => {
                const update = {};
                update[param] = -1;
                expect(() => new TokenBucket(patch(update)))
                    .to.throw(`"${param}" must be greater than 0`);
            });

            it('should fail if ${param} is not an integer', () => {
                const update = {};
                update[param] = 1.2;
                expect(() => new TokenBucket(patch(update)))
                    .to.throw(`"${param}" must be an integer`);
            });

            it('should fail if ${param} is not present', () => {
                const paramsClone = Object.assign({}, params);
                delete paramsClone[param];
                expect(() => new TokenBucket(paramsClone)).to.throw(`"${param}" is required`);
            });
        });
    });

    describe('timestampProvider', () => {
        it('should fail if timestampProvider is not function', () => { 
            expect(() => new TokenBucket(patch({ timestampProvider: 1 })))
                .to.throw('"timestampProvider" must be a Function');
        });
    });
});
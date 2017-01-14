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
        capacity: 10
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
    })

    describe('capacity', () => {
        it('should fail if capacity is not a number', () => {
            expect(() => new TokenBucket(patch({ capacity: 'hello' })))
                .to.throw('"capacity" must be a number');
        });

        it('should fail if capacity is not greater than 0', () => {
            expect(() => new TokenBucket(patch({ capacity: -1 })))
                .to.throw('"capacity" must be greater than 0');
        });

        it('should fail if capacity is not an integer', () => {
            expect(() => new TokenBucket(patch({ capacity: 1.2 })))
                .to.throw('"capacity" must be an integer');
        });

        it('should fail if capacity is not present', () => {
            expect(() => new TokenBucket({ 
                storage: {
                    setAndUnlock: () => {},
                    getAndLock: () => {}
                },
                identifier: 'id'
            })).to.throw('"capacity" is required');
        });
    });
});
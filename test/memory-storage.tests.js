const expect = require('chai').expect;
const sinon = require('sinon');
const Joi = require('joi');
const async = require('async');
const storageSchema = require('../lib/storage-schema');
const MemoryStorage = require('../lib/memory-storage');

describe('memory storage', () => {
    it('should be valid for storage schema', () => {
        const result = Joi.validate(new MemoryStorage(), storageSchema);
        expect(result.error).to.not.exist;
    });

    it('should be able to get and lock and then set and unlock', done => {
        const key = 'id';
        const memoryStorage = new MemoryStorage();

        async.waterfall([
            cb => memoryStorage.getAndLock(key, cb),
            (value, setAndUnlock, cb) => {
                expect(value).to.not.exist;
                setAndUnlock(3, cb);
            },
            cb => memoryStorage.getAndLock(key, cb),
            (value, setAndUnlock, cb) => {
                expect(value).to.equal(3);
                setAndUnlock(cb);
            }
        ], done);
    });

    it('should should not set value when unlocking if no value is provided', done => {
        const key = 'id';
        const memoryStorage = new MemoryStorage();

        async.waterfall([
            cb => memoryStorage.getAndLock(key, cb),
            (value, setAndUnlock, cb) => {
                expect(value).to.not.exist;
                setAndUnlock(cb);
            },
            cb => memoryStorage.getAndLock(key, cb),
            (value, setAndUnlock, cb) => {
                expect(value).to.not.exist;
                setAndUnlock(cb);
            }
        ], done);
    });

    it('should not give lock to second requester if first requester has not released it', done => {
        const key = 'id';
        const memoryStorage = new MemoryStorage();

        memoryStorage.getAndLock(key, err => {
            expect(err).to.not.exist;
            const secondCall = async.timeout(memoryStorage.getAndLock.bind(memoryStorage), 100);
            secondCall(key, (err) => { 
                expect(err).to.exist;
                expect(err.code).to.equal('ETIMEDOUT');
                done();
            });
        });
    });

    it('should be able to get to different locks on different keys', () => {
        const key1 = 'id';
        const key2 = 'id2';
        const memoryStorage = new MemoryStorage();

        async.parallel([
            cb => memoryStorage.getAndLock(key1, cb),
            cb => memoryStorage.getAndLock(key2, cb)
        ], (err, results) => {
            expect(err).to.not.exist;
            async.parallel(results.map(r => r[1]), done);
        });
    });
});
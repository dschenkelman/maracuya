const expect = require('chai').expect;
const sinon = require('sinon');
const async = require('async');
const BucketRegistry = require('../lib/bucket-registry');
const MemoryStorage = require('../lib/memory-storage');
const Configuration = require('../lib/configuration');

describe('#integration', () => {
    beforeEach(() =>{
        this.clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        this.clock.restore();
    });

     const config = {
        'a': {
            perInterval: 1,
            interval: 100,
            capacity: 10
        },
        'b': {
            perInterval: 2,
            interval: 1,
            capacity: 4
        }
    };

    it('should work with one bucket, one type', done => {
        const registry = new BucketRegistry({ configuration: Configuration.fromObject(config) });

        const bucketA1 = registry.get('a', '1');

        // single bucket, single type
        const step1 = cb => async.waterfall([
            // take 10 (maximum at once)
            cb => {
                bucketA1.take(10, cb);
                this.clock.tick(1);
            },
            // try to take 5 now, clock hasn't moved so can't
            (result, cb) => { 
                expect(result).to.be.true; 
                this.clock.tick(1);
                bucketA1.take(5, cb);
            },
            (result, cb) => {
                expect(result).to.be.false;
                // move clock 100, reloads 1 token to bucket
                this.clock.tick(100);
                bucketA1.take(2, cb);
            },
            (result, cb) => {
                expect(result).to.be.false;
                // move clock forward 150, reloads 1.5 tokens to bucket
                this.clock.tick(150);
                bucketA1.take(2, cb);
            },
            (result, cb) => {
                expect(result).to.be.true;
                cb();
            }

        ], cb);

        step1(done);
    });
});
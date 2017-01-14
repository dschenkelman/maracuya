const expect = require('chai').expect;
const sinon = require('sinon');
const BucketType = require('../lib/bucket-type');

describe('BucketType', () => {
    const params = {
        capacity: 10,
        perInterval: 1,
        interval: 1000,
        storage: {
            getAndLock(){}
        }
    };

    const patch = function(update){
        return Object.assign({}, params, update);
    };

    it('should set params as properties', () => {
        const bucketType = new BucketType(params);

        expect(bucketType.capacity).to.equal(10);
        expect(bucketType.perInterval).to.equal(1);
        expect(bucketType.interval).to.equal(1000);
        expect(bucketType.storage).to.deep.equal(params.storage);
    });

    it('should fail if no params are passed', () => {
        expect(() => new BucketType()).to.throw('"params" argument is required');
    });

    describe('storage', () => {
        it('shoud fail if storage is not present', () =>{
            expect(() => new BucketType({ })).to.throw('"storage" is required');
        });

        it('shoud fail if storage is not object', () =>{
            expect(() => new BucketType(patch({ storage: 1 }))).to.throw('"storage" must be an object');
        });

        it('shoud fail if storage does not have getAndLock', () =>{
            expect(() => new BucketType(patch({ 
                storage: {
                    setAndUnlock: () => {}
                }
            }))).to.throw('"getAndLock" is required');
        });
    });

    ['capacity', 'interval', 'perInterval'].forEach(param => {
        describe(param, () => {
            it('should fail if ${param} is not a number', () => {
                const update = {};
                update[param] = 'hello';
                expect(() => new BucketType(patch(update)))
                    .to.throw(`"${param}" must be a number`);
            });

            it('should fail if ${param} is not greater than 0', () => {
                const update = {};
                update[param] = -1;
                expect(() => new BucketType(patch(update)))
                    .to.throw(`"${param}" must be greater than 0`);
            });

            it('should fail if ${param} is not an integer', () => {
                const update = {};
                update[param] = 1.2;
                expect(() => new BucketType(patch(update)))
                    .to.throw(`"${param}" must be an integer`);
            });

            it('should fail if ${param} is not present', () => {
                const paramsClone = Object.assign({}, params);
                delete paramsClone[param];
                expect(() => new BucketType(paramsClone)).to.throw(`"${param}" is required`);
            });
        });
    });
});
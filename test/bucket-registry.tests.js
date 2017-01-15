'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const BucketRegistry = require('../lib/bucket-registry');
const TokenBucket = require('../lib/token-bucket');
const BucketType = require('../lib/bucket-type');

describe('BucketRegistry', () => {
    const DEFAULT_INTERVAL = 1000;
    const DEFAULT_PER_INTERVAL = 1;
    const DEFAULT_CAPACITY = 10;
    const DEFAULT_STORAGE = {
        getAndLock(){},
        setAndUnlock(){}
    };

    const DEFAULT_CONFIGURATION = {
        interval: DEFAULT_INTERVAL,
        capacity: DEFAULT_CAPACITY,
        perInterval: DEFAULT_PER_INTERVAL
    };

    const createRegistry = function createRegistry(patch){
        patch = patch || {};
        
        const configuration = {
            get(){ return DEFAULT_CONFIGURATION; }
        };

        return new BucketRegistry(Object.assign({}, {
            storage: DEFAULT_STORAGE,
            configuration
        }, patch));
    };

    it('should get bucket type params from configuration', () => {
        const type = 'bucket-type';
        const id = 'instance-id';
        const mockConfiguration = {
            get: sinon.mock().once().withExactArgs(type).returns(DEFAULT_CONFIGURATION)
        };

        const registry = createRegistry({
            configuration: mockConfiguration
        });

        const bucketA = registry.get(type, id);
        const bucketB = registry.get(type, id);

        mockConfiguration.get.verify();
    });

    it('should only create one bucket type object if two bucket instances from same type are obtained', () => {
        const typeName = 'bucket-type';
        const id = 'instance-id';
        const id2 = 'instance-id2';
        const mockConfiguration = {
            get: sinon.mock().once().withExactArgs(typeName).returns(DEFAULT_CONFIGURATION)
        };

        const mockFactory = sinon.mock().twice();
        let type;
        mockFactory.withArgs(sinon.match(function(params) {
            if (!type) {
                // first call
                type = params.type
                return true;
            }

            // second call
            return type === params.type;
        }));

        const registry = createRegistry({
            configuration: mockConfiguration,
            bucketFactory: mockFactory
        });
        
        const bucketA = registry.get(typeName, id);
        const bucketB = registry.get(typeName, id2);

        mockConfiguration.get.verify();
        mockFactory.verify();
    });

    it('should always retrieve same bucket if type and instance id are the same', () => {
        const type = 'bucket-type';
        const id = 'instance-id';
        const registry = createRegistry();

        const bucketA = registry.get(type, id);
        const bucketB = registry.get(type, id);
        
        expect(bucketA).to.exist;
        expect(bucketA).to.be.an.instanceof(TokenBucket);
        expect(bucketA).to.equal(bucketB);
    });

    it('should pass bucket type from config when creating TokenBucket', () => {
        const type = 'bucket-type';
        const id = 'instance-id';
        const configuration = {
            interval: 1000,
            perInterval: 1,
            capacity: 10
        };
        
        const mockConfiguration = {
            get: sinon.stub().returns(configuration)
        };

        const mockFactory = sinon.mock().once()
            .withArgs(sinon.match(function(params) {
                return params.type &&
                    params.type.interval === 1000 
                    && params.type.perInterval === 1
                    && params.type.capacity === 10 
                    && params.identifier === 'bucket-type:instance-id'
                    && params.type.storage.getAndLock === DEFAULT_STORAGE.getAndLock
                    && params.type.storage.setAndUnlock === DEFAULT_STORAGE.setAndUnlock;
            })).returns({});

        const registry = new BucketRegistry({
            bucketFactory: mockFactory,
            storage: DEFAULT_STORAGE,
            configuration: mockConfiguration
        });

        const bucketA = registry.get(type, id);
        const bucketB = registry.get(type, id);
        mockFactory.verify();
    });



    describe('params', () => {
        it('should fail if no params are passed', () => {
            expect(() => new BucketRegistry()).to.throw('"params" argument is required');
        });

        it('should fail if bucket factory is not function', () => {
            expect(() => createRegistry({
                bucketFactory: 1
            })).to.throw('"bucketFactory" must be a Function');
        });

        describe('storage', () => {
            it('shoud fail if storage is not present', () =>{
                expect(() => new BucketRegistry({ })).to.throw('"storage" is required');
            });

            it('shoud fail if storage is not object', () =>{
                expect(() => createRegistry({ storage: 1 })).to.throw('"storage" must be an object');
            });

            it('shoud fail if storage does not have getAndLock', () =>{
                expect(() => createRegistry({ 
                    storage: {
                        setAndUnlock: () => {}
                    }
                })).to.throw('"getAndLock" is required');
            });

            it('shoud fail if storage does not have setAndUnlock', () =>{
                expect(() => createRegistry({ 
                    storage: {
                        getAndLock: () => {}
                    }
                })).to.throw('"setAndUnlock" is required');
            });
        });

        describe('configuration', () => {
            it('shoud fail if configuration is not present', () =>{
                expect(() => createRegistry({ configuration: undefined })).to.throw('"configuration" is required');
            });

            it('should fail if configuration is not object', () => {
                expect(() => createRegistry({ configuration: 1 })).to.throw('"configuration" must be an object');
            });

            it('should fail if configuration does not have get', () => {
                expect(() => createRegistry({ configuration: {} })).to.throw('"get" is required');
            });
        });
    });
});
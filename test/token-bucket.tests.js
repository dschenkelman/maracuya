const expect = require('chai').expect;
const sinon = require('sinon');
const TokenBucket = require('../lib/token-bucket');
const BucketType = require('../lib/bucket-type');

describe('token-bucket implementation', () => {
    const DEFAULT_IDENTIFIER = 'bucket-id';
    const DEFAULT_CAPACITY = 10;
    // really large number so tokens don't change
    const DEFAULT_INTERVAL = 1000;
    const DEFAULT_PER_INTERVAL = 1;
    const DEFAULT_LAST_CHANGE = 1000;

    const createBucketType = function createBucketType(patch){
        patch = patch || {};
        const storage = {
            getAndLock: sinon.stub().yields(null, 
                { count: 0, lastChange: DEFAULT_LAST_CHANGE }, 
                sinon.stub().yields(null, null))
        };

        return new BucketType(Object.assign({}, {
            capacity: DEFAULT_CAPACITY, 
            interval: DEFAULT_INTERVAL,
            perInterval: DEFAULT_PER_INTERVAL,
            storage
        }, patch));
    };

    const createTokenBucket = function createTokenBucket(patch){
        patch = patch || {};

        return new TokenBucket(Object.assign({}, {
            type: createBucketType(),
            identifier: DEFAULT_IDENTIFIER, 
            timestampProvider: () => DEFAULT_LAST_CHANGE,
        }, patch));
    };

    describe('failure', () => {
         it('should fail to take 1 token if bucket is empty', done => {
            const bucket = createTokenBucket({
                timestampProvider: () => DEFAULT_LAST_CHANGE
            });

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });

        it('should fail to take 2 tokens if bucket has 1', done => {
            const bucket = createTokenBucket( {
                type: createBucketType({
                    storage: {
                        getAndLock: sinon.stub().yields(null, 
                            { count: 1, lastChange: DEFAULT_LAST_CHANGE },
                            sinon.stub().yields(null, null))
                    }}
                ),
                timestampProvider: () => DEFAULT_LAST_CHANGE
            });

            bucket.take(2, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });

        it('should release lock if it failed to take tokens', done => {
            const mockSetAndUnlock = sinon.mock()
                .withExactArgs(DEFAULT_IDENTIFIER, sinon.match.func)
                .yields(null, null);
            const bucket = createTokenBucket( {
                type: createBucketType({
                    storage: {
                        getAndLock: sinon.stub().yields(null, 
                            { count: 1, lastChange: DEFAULT_LAST_CHANGE },
                            mockSetAndUnlock)
                    }}
                ),
                timestampProvider: () => DEFAULT_LAST_CHANGE
            });

            bucket.take(2, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should not set data and fail to take more tokens than available after drip', done => {
            const toTake = 9;
            const timestamp = 3000;
            const initialCount = 5;
            const timestampProvider = () => timestamp;
            const perInterval = 1;
            const interval = 1000;
            const capacity = 10;
            const mockSetAndUnlock = sinon.mock().once()
                .withExactArgs(DEFAULT_IDENTIFIER, sinon.match.func).yields(null, null);
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 1000,
                    count: initialCount
                }, mockSetAndUnlock)
            };
            
            const bucket = createTokenBucket({
                type: createBucketType({
                    interval, perInterval, storage,
                }),
                timestampProvider 
            });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should get tokens from storage passing bucket identifier', done => {
            const storage = {
                getAndLock: sinon.mock()
                    .once()
                    .withExactArgs(DEFAULT_IDENTIFIER, sinon.match.func)
                    .yields(null, 
                        { count: 0, lastChange: DEFAULT_LAST_CHANGE },
                        sinon.stub().yields(null))
            };
            
            const bucket = createTokenBucket({ type: createBucketType({ storage }) });
            
            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                storage.getAndLock.verify();
                done();
            });
        });
    });

    describe('success', () => {
        it('should succeed taking 1 token from storage if there is one', done => {
            const bucket = createTokenBucket({
                type: createBucketType({
                    storage : {
                        getAndLock: sinon.stub().yields(null, 
                            { count: 1, lastChange: DEFAULT_LAST_CHANGE },
                            sinon.stub().yields(null))
                    }
                })
            });

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                done();
            });
        });

        it('should decrease token amount by 2 if taking > 2 tokens and they are available', done => {
            const toTake = 2;
            const tokensInBucketStart = 3;
            const tokensInBucketEnd = tokensInBucketStart - toTake;
            const timestamp = 1000;
            const timestampProvider = () => timestamp;
            const storage = {
                getAndLock: () => {}
            };

            const mockSetAndUnlock = sinon.mock().once()
                .withExactArgs(DEFAULT_IDENTIFIER, { count: tokensInBucketEnd, lastChange: timestamp }, sinon.match.func)
                .yields(null);

            const mockStorage = sinon.mock(storage);
            mockStorage.expects('getAndLock').once()
                .withExactArgs(DEFAULT_IDENTIFIER, sinon.match.func).yields(null, { count: 3, lastChange: timestamp }, mockSetAndUnlock);
            
            const bucket = createTokenBucket({ 
                type: createBucketType({ storage }), 
                timestampProvider });

            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockStorage.verify();
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should set bucket data in storage if bucket did not exist', done => {
            const toTake = 1;
            const timestamp = 1000;
            const timestampProvider = () => timestamp;
            const mockSetAndUnlock = sinon.mock().once()
                .withExactArgs(DEFAULT_IDENTIFIER, { 
                    count: DEFAULT_CAPACITY - toTake,
                    lastChange: timestamp
                }, sinon.match.func)
                .yields(null, null);
            const storage = {
                getAndLock: sinon.stub().yields(null, null, mockSetAndUnlock)
            };
            
            const bucket = createTokenBucket({ 
                type: createBucketType({ storage }), 
                timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should increase token count in bucket considering time elapsed since last change', done => {
            const toTake = 2;
            const timestamp = 2000;
            const initialCount = 8;
            const timestampProvider = () => timestamp;
            const perInterval = 1;
            const interval = 1000;
            const mockSetAndUnlock = sinon.mock().once()
                .withExactArgs(DEFAULT_IDENTIFIER, { 
                    // count increases one because 1 second elapsed and that's the interval. 
                    // the per interval increase is 1
                    count: initialCount - toTake + 1,
                    lastChange: timestamp
                }, sinon.match.func)
                .yields(null, null);

            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 1000,
                    count: initialCount
                }, mockSetAndUnlock)
            };
            
            const bucket = createTokenBucket({ 
                type: createBucketType({ storage, perInterval, interval }), 
                timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should not increase token count in bucket if last change has higher time than current timestamp, just take', done => {
            const toTake = 2;
            const timestamp = 1000;
            const initialCount = 8;
            const timestampProvider = () => timestamp;
            const perInterval = 1;
            const interval = 1000;
            const mockSetAndUnlock  = sinon.mock().once()
                .withExactArgs(DEFAULT_IDENTIFIER, { 
                    count: initialCount - toTake,
                    lastChange: timestamp
                }, sinon.match.func)
                .yields(null, null);
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 2000,
                    count: initialCount
                }, mockSetAndUnlock)
            };
            
            const bucket = createTokenBucket({ 
                type: createBucketType({ storage, perInterval, interval }), 
                timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should not increase token count to a number larger than bucket capacity', done => {
            const toTake = 2;
            const timestamp = 10000;
            const initialCount = 7;
            const timestampProvider = () => timestamp;
            const perInterval = 1;
            const interval = 1000;
            const capacity = 10;
            const mockSetAndUnlock = sinon.mock().once()
                .withExactArgs(DEFAULT_IDENTIFIER, { 
                    count: capacity - toTake,
                    lastChange: timestamp
                }, sinon.match.func)
                .yields(null, null);
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 1000,
                    count: initialCount
                }, mockSetAndUnlock)
            };
            
            const bucket = createTokenBucket({ 
                type: createBucketType({ storage, perInterval, interval }), 
                timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockSetAndUnlock.verify();
                done();
            });
        });

        it('should be able to take tokens after drip', done => {
            const toTake = 2;
            const timestamp = 4000;
            const initialCount = 0;
            const timestampProvider = () => timestamp;
            const perInterval = 1;
            const interval = 1000;
            const capacity = 10;
            const lastChange = 1000;
            const mockSetAndUnlock = sinon.mock().once().withExactArgs(DEFAULT_IDENTIFIER, { 
                    // initialCount + ((timestamp - lastChange) / interval) - toTake
                    count: 1,
                    lastChange: timestamp
                }, sinon.match.func)
                .yields(null, null);
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange,
                    count: initialCount
                }, mockSetAndUnlock)
            };
            
            const bucket = createTokenBucket({ 
                type: createBucketType({ storage, perInterval, interval }), 
                timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockSetAndUnlock.verify();
                done();
            });
        });
    });

    describe('errors', () => {
        it('should return error if it failed to get tokens from storage', done => {
            const storage = {
                getAndLock: sinon.stub().yields(new Error('Something went wrong'))
            };

            const bucket = createTokenBucket({ type: createBucketType({ storage }) });

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });

        it('should return error if it failed to take tokens from storage', done => {
            const storage = {
                getAndLock: sinon.stub().yields(null, 
                    { count: 1, lastChange: DEFAULT_LAST_CHANGE },
                    sinon.stub().yields(new Error('Something went wrong'))
                )
            };

            const bucket = createTokenBucket({ type: createBucketType({ storage }) });

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });
    });

    describe('params validation', () => {
        const params = {
            type: new BucketType({
                capacity: 10,
                perInterval: 1,
                interval: 1000,
                storage: {
                    getAndLock: () => {}
                }
            }),
            identifier: 'id'
        };

        const patch = function(update){
            return Object.assign({}, params, update);
        };

        it('should fail if no params are passed', () => {
            expect(() => new TokenBucket()).to.throw('"params" argument is required');
        });

        it('should fail if type is not BucketType', () => {
            expect(() => new TokenBucket(patch({ type: {} })))
                .to.throw('"type" must be an instance of "BucketType"');
        });

        describe('timestampProvider', () => {
            it('should fail if timestampProvider is not function', () => { 
                expect(() => new TokenBucket(patch({ timestampProvider: 1 })))
                    .to.throw('"timestampProvider" must be a Function');
            });
        });

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
    });
});
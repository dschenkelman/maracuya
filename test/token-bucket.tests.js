const expect = require('chai').expect;
const sinon = require('sinon');
const TokenBucket = require('../lib/token-bucket');

describe('token-bucket implementation', () => {
    const DEFAULT_IDENTIFIER = 'bucket-id';
    const DEFAULT_CAPACITY = 10;
    // really large number so tokens don't change
    const DEFAULT_INTERVAL = 1000;
    const DEFAULT_PER_INTERVAL = 1;
    const DEFAULT_LAST_CHANGE = 1000;
    const createTokenBucket = function createTokenBucket(patch){
        patch = patch || {};
        const storage = {
            getAndLock: sinon.stub().yields(null, { count: 0, lastChange: DEFAULT_LAST_CHANGE }),
            setAndUnlock: sinon.stub().yields(null)
        };

        return new TokenBucket(Object.assign({}, { 
            identifier: DEFAULT_IDENTIFIER, 
            capacity: DEFAULT_CAPACITY, 
            interval: DEFAULT_INTERVAL,
            perInterval: DEFAULT_PER_INTERVAL,
            timestampProvider: () => DEFAULT_LAST_CHANGE,
            storage
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
                storage: {
                    getAndLock: sinon.stub().yields(null, { count: 1, lastChange: DEFAULT_LAST_CHANGE }),
                    setAndUnlock: () => {}
                },
                timestampProvider: () => DEFAULT_LAST_CHANGE
            });

            bucket.take(2, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
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
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 1000,
                    count: initialCount
                }),
                setAndUnlock: sinon.mock().never()
            };
            
            const bucket = createTokenBucket({ 
                interval, perInterval, 
                storage, timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                storage.setAndUnlock.verify();
                done();
            });
        });

        it('should get tokens from storage passing bucket identifier', done => {
            const storage = {
                getAndLock: sinon.mock()
                    .once()
                    .withArgs(DEFAULT_IDENTIFIER)
                    .yields(null, { count: 0, lastChange: DEFAULT_LAST_CHANGE }),
                setAndUnlock: sinon.stub().yields(null, null),
            };
            
            const bucket = createTokenBucket({ storage });
            
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
                storage : {
                    getAndLock: sinon.stub().yields(null, { count: 1, lastChange: DEFAULT_LAST_CHANGE }),
                    setAndUnlock: sinon.stub().yields(null)
                }
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
                getAndLock: () => {},
                setAndUnlock: () => {}   
            };

            const mockStorage = sinon.mock(storage);
            mockStorage.expects('getAndLock').once()
                .withArgs(DEFAULT_IDENTIFIER).yields(null, { count: 3, lastChange: timestamp });
            mockStorage.expects('setAndUnlock')
                .once()
                .withArgs(DEFAULT_IDENTIFIER, { count: tokensInBucketEnd, lastChange: timestamp })
                .yields(null);

            const bucket = createTokenBucket({ storage, timestampProvider });

            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                mockStorage.verify();
                done();
            });
        });

        it('should set bucket data in storage if bucket did not exist', done => {
            const toTake = 1;
            const timestamp = 1000;
            const timestampProvider = () => timestamp;
            const storage = {
                getAndLock: sinon.stub().yields(null, null),
                setAndUnlock: sinon.mock().once()
                    .withArgs(DEFAULT_IDENTIFIER, { 
                        count: DEFAULT_CAPACITY - toTake,
                        lastChange: timestamp
                    })
                    .yields(null, null)
            };
            
            const bucket = createTokenBucket({ storage, timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                storage.setAndUnlock.verify();
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
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 1000,
                    count: initialCount
                }),
                setAndUnlock: sinon.mock().once()
                    .withArgs(DEFAULT_IDENTIFIER, { 
                        // count increases one because 1 second elapsed and that's the interval. 
                        // the per interval increase is 1
                        count: initialCount - toTake + 1,
                        lastChange: timestamp
                    })
                    .yields(null, null)
            };
            
            const bucket = createTokenBucket({ 
                interval, perInterval, 
                storage, timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                storage.setAndUnlock.verify();
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
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 2000,
                    count: initialCount
                }),
                setAndUnlock: sinon.mock().once()
                    .withArgs(DEFAULT_IDENTIFIER, { 
                        count: initialCount - toTake,
                        lastChange: timestamp
                    })
                    .yields(null, null)
            };
            
            const bucket = createTokenBucket({ 
                interval, perInterval, 
                storage, timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                storage.setAndUnlock.verify();
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
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange: 1000,
                    count: initialCount
                }),
                setAndUnlock: sinon.mock().once()
                    .withArgs(DEFAULT_IDENTIFIER, { 
                        count: capacity - toTake,
                        lastChange: timestamp
                    })
                    .yields(null, null)
            };
            
            const bucket = createTokenBucket({ 
                interval, perInterval, 
                storage, timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                storage.setAndUnlock.verify();
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
            const storage = {
                getAndLock: sinon.stub().yields(null, {
                    lastChange,
                    count: initialCount
                }),
                setAndUnlock: sinon.mock().once()
                    .withArgs(DEFAULT_IDENTIFIER, { 
                        // initialCount + ((timestamp - lastChange) / interval) - toTake
                        count: 1,
                        lastChange: timestamp
                    })
                    .yields(null, null)
            };
            
            const bucket = createTokenBucket({ 
                interval, perInterval, 
                storage, timestampProvider });
            
            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                storage.setAndUnlock.verify();
                done();
            });
        });
    });

    describe('errors', () => {
        it('should return error if it failed to get tokens from storage', done => {
            const storage = {
                getAndLock: sinon.stub().yields(new Error('Something went wrong')),
                setAndUnlock: () => {}
            };

            const bucket = createTokenBucket({ storage });

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });

        it('should return error if it failed to take tokens from storage', done => {
            const storage = {
                getAndLock: sinon.stub().yields(null, { count: 1, lastChange: DEFAULT_LAST_CHANGE }),
                setAndUnlock: sinon.stub().yields(new Error('Something went wrong'))
            };

            const bucket = createTokenBucket({ storage });

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });
    });
});
const expect = require('chai').expect;
const sinon = require('sinon');
const TokenBucket = require('../lib/token-bucket');

describe('token-bucket implementation', () => {
    const DEFAULT_IDENTIFIER = 'bucket-id';
    const DEFAULT_CAPACITY = 10;
    const createTokenBucket = function createTokenBucket(patch){
        patch = patch || {};
        const storage = {
            getAndLock: sinon.stub().yields(null, 0),
            setAndUnlock: sinon.stub().yields(null)
        };

        return new TokenBucket(Object.assign({}, { 
            identifier: DEFAULT_IDENTIFIER, 
            capacity: DEFAULT_CAPACITY, 
            storage 
        }, patch));
    };

    describe('failure', () => {
         it('should fail to take 1 token if bucket is empty', done => {
            const bucket = createTokenBucket();

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });

        it('should fail to take 2 tokens if bucket has 1', done => {
            const bucket = createTokenBucket( {
                storage: {
                    getAndLock: sinon.stub().yields(null, 1),
                    setAndUnlock: () => {}
                }
            });

            bucket.take(2, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });
    });

    describe('success', () =>{ 
        it('should get tokens from storage passing bucket identifier', done => {
            const storage = {
                getAndLock: sinon.mock()
                    .once()
                    .withArgs(DEFAULT_IDENTIFIER)
                    .yields(null, 0),
                setAndUnlock: () => {}
            };
            
            const bucket = createTokenBucket({ storage });
            
            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                storage.getAndLock.verify();
                done();
            });
        });

        it('should succeed taking 1 token from storage if there is one', done => {
            const bucket = createTokenBucket({
                storage : {
                    getAndLock: sinon.stub().yields(null, 1),
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
            const storage = {
                getAndLock: () => {},
                setAndUnlock: () => {}   
            };

            const mockStorage = sinon.mock(storage);
            mockStorage.expects('getAndLock').once()
                .withArgs(DEFAULT_IDENTIFIER).yields(null, 3);
            mockStorage.expects('setAndUnlock')
                .once().withArgs(DEFAULT_IDENTIFIER, tokensInBucketEnd).yields(null);

            const bucket = createTokenBucket({ storage });

            bucket.take(toTake, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
            mockStorage.verify();
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
                getAndLock: sinon.stub().yields(null, 1),
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
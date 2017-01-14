const expect = require('chai').expect;
const sinon = require('sinon');
const TokenBucket = require('../lib/token-bucket');

describe('token-bucket', () => {
    describe('failure', () => {
         it('should fail to take 1 token if bucket is empty', done => {
            const identifier = 'bucket-name';
            const storage = {
                getTokens: sinon.stub().yields(null, 0)
            };

            const bucket = new TokenBucket(identifier, storage);

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });

        it('should fail to take 2 tokens if bucket has 1', done => {
            const identifier = 'bucket-name';
            const storage = {
                getTokens: sinon.stub().yields(null, 1)
            };

            const bucket = new TokenBucket(identifier, storage);

            bucket.take(2, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });
    });

    describe('success', () =>{ 
        it('should get tokens from storage passing bucket identifier', done => {
            const identifier = 'bucket-name';
            const storage = {
                getTokens: sinon.mock()
                    .once()
                    .withArgs(identifier)
                    .yields(null, 0)
            };

            const bucket = new TokenBucket(identifier, storage);

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                storage.getTokens.verify();
                done();
            });
        });

        it('should succeed taking 1 token from storage if there is one', done => {
            const identifier = 'bucket-name';
            const storage = {
                getTokens: sinon.stub().yields(null, 1),
                updateTokensAndUnlock: sinon.stub().yields(null)
            };

            const bucket = new TokenBucket(identifier, storage);

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.true;
                done();
            });
        });

        it('should decrease token amount by 2 if taking > 2 tokens and they are available', done => {
            const identifier = 'bucket-name';
            const toTake = 2;
            const tokensInBucketStart = 3;
            const tokensInBucketEnd = tokensInBucketStart - toTake;
            const storage = {
                getTokens: () => {},
                updateTokensAndUnlock: () => {}   
            };

            const mockStorage = sinon.mock(storage);
            mockStorage.expects('getTokens').once().withArgs(identifier).yields(null, 3);
            mockStorage.expects('updateTokensAndUnlock')
                .once().withArgs(identifier, tokensInBucketEnd).yields(null);

            const bucket = new TokenBucket(identifier, storage);

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
            const identifier = 'bucket-name';
            const storage = {
                getTokens: sinon.stub().yields(new Error('Something went wrong'))
            };

            const bucket = new TokenBucket(identifier, storage);

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });

        it('should return error if it failed to take tokens from storage', done => {
            const identifier = 'bucket-name';
            const storage = {
                getTokens: sinon.stub().yields(null, 1),
                updateTokensAndUnlock: sinon.stub().yields(new Error('Something went wrong'))
            };

            const bucket = new TokenBucket(identifier, storage);

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });
    });
});
const expect = require('chai').expect;
const sinon = require('sinon');
const TokenBucket = require('../lib/token-bucket');

describe('token-bucket', () => {
    describe('options', () => {
        it('should fail if identifier is not present', () => {
            expect(() => new TokenBucket({})).to.throw('"identifier" is required');
        });

        it('should fail if identifier is not string', () => {
            expect(() => new TokenBucket({ identifier: []})).to.throw('"identifier" must be a string');
        });

        it('should fail if identifier is empty', () => {
            expect(() => new TokenBucket({ identifier: ''})).to.throw('"identifier" is not allowed to be empty');
        });

        it('shoud fail if storage is not present', () =>{
            expect(() => new TokenBucket({ identifier: 'valid' })).to.throw('"storage" is required');
        });

        it('shoud fail if storage is not object', () =>{
            expect(() => new TokenBucket({ identifier: 'valid', storage: 1 })).to.throw('"storage" must be an object');
        });

        it('shoud fail if storage does not have getAndLock', () =>{
            expect(() => new TokenBucket({ 
                storage: {
                    setAndUnlock: () => {}
                },
                identifier: 'valid' 
            })).to.throw('"getAndLock" is required');
        });

         it('shoud fail if storage does not have setAndUnlock', () =>{
            expect(() => new TokenBucket({ 
                storage: {
                    getAndLock: () => {}
                },
                identifier: 'valid' 
            })).to.throw('"setAndUnlock" is required');
        });
    });
    describe('failure', () => {
         it('should fail to take 1 token if bucket is empty', done => {
            const identifier = 'bucket-name';
            const storage = {
                getAndLock: sinon.stub().yields(null, 0),
                setAndUnlock: () => {}
            };

            const bucket = new TokenBucket({ identifier, storage });

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                done();
            });
        });

        it('should fail to take 2 tokens if bucket has 1', done => {
            const identifier = 'bucket-name';
            const storage = {
                getAndLock: sinon.stub().yields(null, 1),
                setAndUnlock: () => {}
            };

            const bucket = new TokenBucket({ identifier, storage });

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
                getAndLock: sinon.mock()
                    .once()
                    .withArgs(identifier)
                    .yields(null, 0),
                setAndUnlock: () => {}
            };

            const bucket = new TokenBucket({ identifier, storage });

            bucket.take(1, (err, result) => {
                expect(err).to.not.exist;
                expect(result).to.be.false;
                storage.getAndLock.verify();
                done();
            });
        });

        it('should succeed taking 1 token from storage if there is one', done => {
            const identifier = 'bucket-name';
            const storage = {
                getAndLock: sinon.stub().yields(null, 1),
                setAndUnlock: sinon.stub().yields(null)
            };

            const bucket = new TokenBucket({ identifier, storage });

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
                getAndLock: () => {},
                setAndUnlock: () => {}   
            };

            const mockStorage = sinon.mock(storage);
            mockStorage.expects('getAndLock').once().withArgs(identifier).yields(null, 3);
            mockStorage.expects('setAndUnlock')
                .once().withArgs(identifier, tokensInBucketEnd).yields(null);

            const bucket = new TokenBucket({ identifier, storage });

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
                getAndLock: sinon.stub().yields(new Error('Something went wrong')),
                setAndUnlock: () => {}
            };

            const bucket = new TokenBucket({ identifier, storage });

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });

        it('should return error if it failed to take tokens from storage', done => {
            const identifier = 'bucket-name';
            const storage = {
                getAndLock: sinon.stub().yields(null, 1),
                setAndUnlock: sinon.stub().yields(new Error('Something went wrong'))
            };

            const bucket = new TokenBucket({ identifier, storage });

            bucket.take(1, (err, result) => {
                expect(err).to.exist;
                expect(err.message).to.equal('Something went wrong');
                done();
            });
        });
    });
});
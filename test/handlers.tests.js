const expect = require('chai').expect;
const sinon = require('sinon');
const Handlers = require('../lib/handlers');

describe('Handlers', () => {
    it('should invoke callback with error if get returns null', done => {
        const type = 'bucket-type';
        const instanceId = 'instance';

        const getMock = sinon.mock().once().withExactArgs(type, instanceId)
            .returns(null);

        const handlers = new Handlers({
            get: getMock
        });

        handlers.take(type, instanceId, 1, err => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(`Invalid bucket type ${type}`);
            getMock.verify();
            done();
        });
    });

    it('should invoke callback with error provided by bucket', done => {
        const type = 'bucket-type';
        const instanceId = 'instance';

        const amount = 2;
        const errorMessage = 'something went wrong';

        const error = new Error(errorMessage);

        const bucketMock = {
            take: sinon.mock().once()
                .withExactArgs(amount, sinon.match.func)
                .yields(error, null)
        };

        const getMock = sinon.mock().once().withExactArgs(type, instanceId)
            .returns(bucketMock);

         const handlers = new Handlers({
            get: getMock
        });
        
        handlers.take(type, instanceId, amount, (err, result) => {
            expect(err).to.be.an.instanceOf(Error);
            expect(err.message).to.equal(errorMessage);
            getMock.verify();
            bucketMock.take.verify();
            done();
        });
    });

    it('should invoke callback with value provided by bucket', done => {
        const type = 'bucket-type';
        const instanceId = 'instance';

        const amount = 2;

        const returnValue = { a: 1, b: 2 };

        const bucketMock = {
            take: sinon.mock().once()
                .withExactArgs(amount, sinon.match.func)
                .yields(null, returnValue)
        };

        const getMock = sinon.mock().once().withExactArgs(type, instanceId)
            .returns(bucketMock);

         const handlers = new Handlers({
            get: getMock
        });
        
        handlers.take(type, instanceId, amount, (err, result) => {
            expect(err).to.not.exist;
            expect(result).to.deep.equal({ a: 1, b: 2 });
            getMock.verify();
            bucketMock.take.verify();
            done();
        });
    });
});
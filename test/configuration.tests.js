const expect = require('chai').expect;
const sinon = require('sinon');
const Configuration = require('../lib/configuration');

describe('Configuration', () => {
    it('should be able to get configuration for existing type', () => {
        const root = { 
            'type': {
                interval: 1,
                capacity: 1,
                perInterval: 1
            } 
        };

        const config = Configuration.fromObject(root);
        expect(config.get('type')).to.deep.equal({
            interval: 1,
            capacity: 1,
            perInterval: 1
        });
    });

    it('should not be able to get configuration for non existing type', () => {
        const root = { 
            'type': {
                interval: 1,
                capacity: 1,
                perInterval: 1
            } 
        };

        const config = Configuration.fromObject(root);
        expect(config.get('another-type')).to.not.exist;
    });

    describe('params', () => {
        it('should fail to create if root is not passed as parameter', () => {
            expect(() => Configuration.fromObject()).to.throw('"config" argument is required');
        }); 

        it('should fail to create if root is not an object', () => {
            expect(() => Configuration.fromObject('string')).to.throw('"value" must be an object');
        });

        it('should fail to create if root has property with invalid char', () => {
            const invalidChar = ':';
            const root = { [invalidChar]: {} }

            expect(() => Configuration.fromObject(root)).to.throw('":" is not allowed');
        });

        it(`should fail to create if type configuration has invalid property`, () => {
            const invalidChar = ':';
            const root = { 
                'type': {
                    interval: 1,
                    capacity: 1,
                    perInterval: 1,
                    invalid: true
                } 
            };

            expect(() => Configuration.fromObject(root)).to.throw('"invalid" is not allowed');
        });

        ['perInterval', 'interval', 'capacity'].forEach(prop => {
            it(`should fail to create if type configuration does not have ${prop}`, () => {
                const invalidChar = ':';
                const root = { 
                    'type': {
                        interval: 1,
                        capacity: 1,
                        perInterval: 1
                    } 
                };

                delete root.type[prop];

                expect(() => Configuration.fromObject(root)).to.throw(`"${prop}" is required`);
            });

            it(`should fail to create if type configuration ${prop} is not integer`, () => {
                const invalidChar = ':';
                const root = { 
                    'type': {
                        interval: 1,
                        capacity: 1,
                        perInterval: 1
                    } 
                };

                root.type[prop] = 1.1;

                expect(() => Configuration.fromObject(root)).to.throw(`"${prop}" must be an integer`);
            });

            it(`should fail to create if type configuration ${prop} is not number`, () => {
                const invalidChar = ':';
                const root = { 
                    'type': {
                        interval: 1,
                        capacity: 1,
                        perInterval: 1
                    } 
                };

                root.type[prop] = 'string';

                expect(() => Configuration.fromObject(root)).to.throw(`"${prop}" must be a number`);
            });

            it(`should fail to create if type configuration ${prop} is less than 0`, () => {
                const invalidChar = ':';
                const root = { 
                    'type': {
                        interval: 1,
                        capacity: 1,
                        perInterval: 1
                    } 
                };

                root.type[prop] = -1;

                expect(() => Configuration.fromObject(root)).to.throw(`"${prop}" must be greater than 0`);
            });

            it(`should fail to create if type configuration ${prop} is equals 0`, () => {
                const invalidChar = ':';
                const root = { 
                    'type': {
                        interval: 1,
                        capacity: 1,
                        perInterval: 1
                    } 
                };

                root.type[prop] = 0;

                expect(() => Configuration.fromObject(root)).to.throw(`"${prop}" must be greater than 0`);
            });
        });
    });
});
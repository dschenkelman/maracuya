const Joi = require('joi');

module.exports = Joi.object().keys({
    getAndLock: Joi.func().required()
});
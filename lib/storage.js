const Joi = require('joi');

module.exports = {
    schema: Joi.object().keys({
        getAndLock: Joi.func().required(),
        setAndUnlock: Joi.func().required()
    })
};
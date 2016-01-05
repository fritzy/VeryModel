'use strict';

const joi = require('joi');

module.exports = {
  baseDefinition: {
    validate: joi.any(),
    processors: {},
    hidden: false
  },
  validation: joi.object().keys({
    validate: joi.object(),
    processors: joi.object(),
    alias: joi.string(),
    model: joi.any(),
    collection: joi.any(),
    hidden: joi.boolean().default(false),
    default: joi.any()
  })
};

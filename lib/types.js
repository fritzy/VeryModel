'use strict';

const joi = require('joi');
const defSpec = require('./definition');

const types = {
};

function addType(name, def) {
  joi.assert(def, defSpec.validation);
  types[name] = def;
};

function addTypes(defs) {
  defs.forEach((name) => {
    addType(name, defs[name]);
  });
};

module.exports = {
  addType,
  addTypes,
  types
};

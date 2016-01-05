'use strict';

const libModel = require('./lib/model');
const libTypes = require('./lib/types');

module.exports = {
  Model: libModel.Model,
  getModel: libModel.getModel,
  addType: libTypes.addType,
  addTypes: libTypes.addTypes
};

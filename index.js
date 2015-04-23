var definition = require('./lib/definition');

exports.VeryModel = require('./lib/model');
exports.Model = exports.VeryModel;
exports.VeryCollection = require('./lib/collection');
exports.registerTypes = definition.registerTypes;

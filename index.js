var VeryValidator = require('./lib/validator');
var definition = require('./lib/definition');


exports.VeryModel = require('./lib/model');
exports.VeryCollection = require('./lib/collection');
exports.VeryValidator = function () {
    return new VeryValidator();
};
exports.VeryType = function () {
    return new VeryValidator();
};
exports.registerTypes = definition.registerTypes;

var VeryValidator = require('./lib/validator');


exports.VeryModel = require('./lib/model');
exports.VeryCollection = require('./lib/collection');
exports.VeryValidator = function () {
    return new VeryValidator();
};
exports.VeryType = function () {
    return new VeryValidator();
};

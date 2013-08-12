var VeryValidator = require('./validator');


var Types = {
    'number'       : new VeryValidator().isNumeric(),
    'alpha'        : new VeryValidator().isAlpha(),
    'alphanumeric' : new VeryValidator().isAlphanumeric(),
    'date'         : new VeryValidator().isDate(),
    'email'        : new VeryValidator().isEmail(),
    'boolean'      : new VeryValidator().isType('boolean'),
    'function'     : new VeryValidator().isType('function'),
};


exports.Types = Types;

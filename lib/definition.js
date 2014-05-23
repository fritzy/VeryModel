var VeryValidator = require('./validator');
var underscore = require('underscore');

var types = {
    'number'       :  {validate:  new VeryValidator().isNumeric()},
    'alpha'        :  {validate:  new VeryValidator().isAlpha()},
    'alphanumeric' :  {validate:  new VeryValidator().isAlphanumeric()},
    'date'         :  {
        validate:  new VeryValidator().isDate(),
        default: function () {
            return Date.now();
        }
    },
    'email'        :  {validate:  new VeryValidator().isEmail()},
    'boolean'      :  {
        validate:   new VeryValidator().isType('boolean'),
        default:    false,
        onSet:      Boolean,
        processIn:  Boolean,
    },
    'enum': {
        validate: function (value) {
            if (this.values.indexOf(value) === -1) {
                return ["Value is not one of valid enum values"];
            } else {
                return [];
            }
        }
    },
    'integer': {
        validate: function (value) {
            if (value !== parseInt(value, 10)) {
                return ["Not an integer"];
            } else {
                return [];
            }
        },
        processIn: function (v) {
            return parseInt(v, 10);
        },
        setTo: function (v) {
            return parseInt(v, 10);
        },
    },
    'string': {
        validate: function (v) {
            if (typeof v !== 'string') {
                return "Not a string";
            }
            if (typeof this.max !== 'undefined' && v.length > this.max) {
                return "Larger than max";
            }
            if (typeof this.min !== 'undefined' && v.length < this.min) {
                return "Smaller than min";
            }
            return [];
        },
        processIn: String,
        onSet: String,
        processOut: function (v) {
            if (typeof this.max === 'number') {
                return v.slice(0, this.max);
            }
            return v;
        },
        default: "",
    },
    'array': {
        validate: function (v) {
            if (!Array.isArray(v)) {
                return "Not an array";
            }
            if (typeof this.max !== 'undefined' && v.length > this.max) {
                return "Larger than max";
            }
            if (typeof this.min !== 'undefined' && v.length < this.min) {
                return "Smaller than min";
            }
            return [];
        },
        processIn: Array,
        onSet: Array,
        processOut: function (v) {
            if (typeof this.max === 'number') {
                return v.slice(0, this.max);
            }
            return v;
        },
        default: function () { return []; },
        required: true,
    },
};

function wrapType(builtin, other) {
    var newobj = underscore.clone(builtin);
    var otherkeys = Object.keys(other);
    var key;
    for (var kidx in otherkeys) {
        key = otherkeys[kidx];
        if (key === 'processIn' || key === 'processOut' || key === 'onSet') {
            if (builtin.hasOwnProperty(key)) {
                newobj[key] = function (value) {
                    return other[key].call(this, builtin[key].call(this, value));
                };
            } else {
                newobj[key] = other[key];
            }
        } else if (key === 'validate') {
            newobj[key] = function (value) {
                var errors = [];
                [builtin, other].forEach(function (def) {
                    var newerrors = [];
                    if (typeof def.validate === 'function') {
                        newerrors = def.validate(value);
                    } else if (typeof def.validate.validate === 'function') {
                        newerrors = def.validate.validate(value);
                    }
                    if (Array.isArray(newerrors)) {
                        errors = errors.concat(newerrors);
                    } else {
                        errors.push(newerrors);
                    }
                });
                return errors;
            };
        } else {
            newobj[key] = other[key];
        }
    }
    return newobj;
}


exports.types = types;
exports.wrapType = wrapType;
exports.registerTypes = function (newtypes) {
    underscore.extend(types, newtypes);
};

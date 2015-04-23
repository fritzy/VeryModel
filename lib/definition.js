var lodash = require('lodash');
var joi = require('joi');

var types = {
    'number'       :  {validate: joi.number()},
    'alpha'        :  {validate: joi.string().regex(/^[a-z]+$/i)},
    'alphanumeric' :  {validate: joi.string().alphanum()},
    'date'         :  {
        validate:  joi.date(),
        default: function () {
            return Date.now();
        }
    },
    'email'        :  {validate: joi.string().email()},
    'boolean'      :  {
        validate: joi.boolean(),
        default:    false,
        onSet:      Boolean,
        processIn:  Boolean,
    },
    'integer': {
        validate: joi.number().integer(),
        processIn: function (v) {
            return parseInt(v, 10);
        },
        setTo: function (v) {
            return parseInt(v, 10);
        },
    },
    'enum': {
        validate: function (value) {
            return joi.any().valid(this.values).validate(value);
        },
    },
    'string': {
        validate: joi.string(),
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
        validate: joi.array(),
        //processIn: Array,
        //onSet: Array,
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
    var newobj = lodash.clone(builtin);
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
    lodash.extend(types, newtypes);
};

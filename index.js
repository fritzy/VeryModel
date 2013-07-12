var Validator = require('validator').Validator;
var validators = require('validator').validators;
var check = require('validator').check;

function VeryType() {
    this.validations = [];
    this.v = new Validator;
    this.errors = [];
    this.v.error = function(msg) {
        this.errors.push(msg);
    }.bind(this);
}

(function() {

    var valfuncs = Object.keys(validators);
    valfuncs.forEach(function(vfunc) {
        this[vfunc] = function () {
            var args = Array.prototype.splice.call(arguments, 0);
            this.validations.push({vfunc: vfunc, args: args});
            return this;
        };
    }.bind(this));

    this.validate = function(value) {
        this.errors = [];
        var c = this.v.check(value);
        for (var vidx in this.validations) {
            var conf = this.validations[vidx];
            if (conf.vfunc) {
                c = this.v[conf.vfunc].apply(this.v, conf.args);
            }
        }
        return this.errors;
    }


}).call(VeryType.prototype);


function ModelArray(modeldef) {
    this.modeldef = modeldef;

    this.__defineGetter__('length', function () {
        var keys = Object.keys(this);
        var count = 0;
        keys.forEach(function(key) {
            if(typeof key === 'number') {
                count++;
            }
        });
        return count;
    });
}

(function() {

    this.pop = function () {
    };

    this.push = function (value) {
        var model = this.modeldef.create(value);
        this[Number(this.length)] = model;
        return model;
    };
    
    this.delete = function(idx) {
        delete this[idx];
    };

    this.forEach = function(cb) {
        var keys = Object.keys(this).sort();
        keys.forEach(function(key) {
            if (typeof key === 'number' || key.match(/^[0-9]+$/)) {
                cb(this[key]);
            }
        }.bind(this));
    };

    
}).call(ModelArray.prototype);


function VeryModel(definition) {
    this.definition = definition;
    this.fields = Object.keys(definition);
    this.fields.forEach(function (field) {
        if (this.definition[field].hasOwnProperty('model')) {
            if (this.definition[field].model instanceof VeryModel) {
                this.definition[field].subModel = this.definition[field].model;
                this.definition[field].model = this.definition[field].subModel.definition;
            } else {
                this.definition[field].subModel = new VeryModel(this.definition[field].model);
            }
        } else if (this.definition[field].hasOwnProperty('modelArray')) {
            if (this.definition[field].modelArray instanceof VeryModel) {
                this.definition[field].subModelArray = this.definition[field].modelArray;
                this.definition[field].modelArray = this.definition[field].subModelArray.definition;
            } else {
                this.definition[field].subModelArray = new VeryModel(this.definition[field].modelArray);
            }
        }
    }.bind(this));
}

(function() {

    this.create = function (value) {
        var model = new Object;
        model.__parent = this;
        model.__data = {};
        this.fields.forEach(function(field) {
            model.__defineGetter__(field, function() {
                return this.__data[field];
            });
            if (model.__parent.definition[field].hasOwnProperty('model')) {
                model.__data[field] = model.__parent.definition[field].subModel.create();
                model.__defineSetter__(field, function(value) {
                    this.__data[field].load(value);
                });
            } else if (model.__parent.definition[field].hasOwnProperty('modelArray')) {
                model.__data[field] = new ModelArray(model.__parent.definition[field].subModelArray);
            } else {
                if (model.__parent.definition[field].required)
                    model.__data[field] = model.__parent.definition[field].default;
                model.__defineSetter__(field, function(value) {
                    if ((this.__parent.definition.hasOwnProperty('type') && this.__parent.definition.type.validate(value)) || !this.__parent.definition.hasOwnProperty('type')) {
                        this.__data[field] = value;
                    }
                })
            }
        }.bind(this));

        model.__loadData = function (value) {
            Object.keys(value).forEach(function (key) {
                if (this.__parent.definition[key].hasOwnProperty('modelArray')) {
                    for (var vidx in value[key]) {
                        this.__data[key].push(value[key][vidx]);
                    }
                } else {
                    model[key] = value[key];
                }
            }.bind(this));
        };

        model.__toObject = function () {
            var obj = new Object();
            Object.keys(this.__parent.definition).forEach(function(field) {
                if (this.__parent.definition[field].hasOwnProperty('model')) {
                    obj[field] = this.__data[field].__toObject();
                } else if (this.__parent.definition[field].hasOwnProperty('modelArray')) {
                    obj[field] = [];
                    this.__data[field].forEach(function (inst) {
                        obj[field].push(inst.__toObject());
                    });
                } else {
                    obj[field] = this[field];
                    if (typeof obj[field] === 'undefined') {
                        delete obj[field];
                    }
                }

            }.bind(this));
            return obj;
        };

        model.__validate = function () {
            var errors = {};
            Object.keys(this.__parent.definition).forEach(function(field) {
                var merrors;
                if (this.__parent.definition[field].required && !this.__data.hasOwnProperty(field)) {
                    errors[field] = 'Required and not set.';
                    return;
                }
                if (this.__parent.definition[field].hasOwnProperty('model') && this.__data.hasOwnProperty(field)) {
                    merrors = this.__data[field].__validate();
                    if (merrors.errored === true) {
                        errors[field] = merrors.errors;
                    }
                } else if (this.__parent.definition[field].hasOwnProperty('modelArray') && this.__data.hasOwnProperty(field)) {
                    var arrayerrors = [];
                    this.__data[field].forEach( function (model) {
                        merrors = model.__validate();
                        if (merrors.errored === true) {
                            arrayerrors.push(merrors.error);
                        }
                    });
                    if (arrayerrors.length) {
                        errors[field] = arrayerrors;
                    }
                } else if (this.__data.hasOwnProperty(field) && this.__parent.definition[field].hasOwnProperty('type')) {
                    merrors = this.__parent.definition[field].type.validate(this.__data[field]);
                    if (merrors.length > 0) {
                        errors[field] = merrors;
                    }
                }

            }.bind(this));
            return {errored: Object.keys(errors).length > 0, errors: errors};
        };

        model.__toJSON = function () {
            return JSON.stringify(this.__toObject());
        }
        
        if (typeof value !== 'undefined') {
            model.__loadData(value);
        }


        return model;
    };

    this.load = function(other) {
    };

    this.validate = function() {
    };

}).call(VeryModel.prototype);

module.exports = {
    VeryModel: VeryModel,
    VeryType: function () { return new VeryType; }
};


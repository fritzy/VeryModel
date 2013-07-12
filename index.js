var Validator = require('validator').Validator;
var validators = require('validator').validators;
var check = require('validator').check;

/*VeryType is a wrapper for node-validator, that allows you to re-use
 * validation chains.
 * See https://github.com/chriso/node-validator
 */
function VeryType() {
    this.validations = [];
    this.v = new Validator;
    this.errors = [];

    //override Validator errors so exceptions aren't raised
    //and so that we can gather error messages
    this.v.error = function(msg) {
        this.errors.push(msg);
    }.bind(this);
}

(function() {

    //iterate through all of node-validator's validators
    //to create wrapper functions on VeryType
    var valfuncs = Object.keys(validators);
    valfuncs.forEach(function(vfunc) {
        this[vfunc] = function () {
            var args = Array.prototype.splice.call(arguments, 0);
            //each wrapper records the function and args
            //for later chaining
            this.validations.push({vfunc: vfunc, args: args});
            return this;
        };
    }.bind(this));

    delete valfuncs;

    //run the recorded validator chain and return the errors
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


/* ModelArray: array-like object
 * for managaging lists/collections of models
 * of a single model type
 */
function ModelArray(modeldef, parent) {
    this.modeldef = modeldef;
    this.parent = parent;

    //we treat local number properties as the items
    this.__defineGetter__('length', function () {
        var keys = Object.keys(this);
        var count = 0;
        keys.forEach(function(key) {
            if(typeof key === 'number' || key.match(/^[0-9]+$/)) {
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
        model.__parent = this;
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


/* VeryModel, for spawning models out of a definition
 */
function VeryModel(definition) {
    this.definition = definition;

    //initialize sub model definitions recursively
    this.fields = Object.keys(definition);
    this.fields.forEach(function (field) {
        if (this.definition[field].hasOwnProperty('model')) {
            //if we get a VeryModel instance instead of a definition object
            //we have to switch things up
            if (this.definition[field].model instanceof VeryModel) {
                this.definition[field].subModel = this.definition[field].model;
                this.definition[field].model = this.definition[field].subModel.definition;
            } else {
                //initialize sub VeryModel
                this.definition[field].subModel = new VeryModel(this.definition[field].model);
            }
        } else if (this.definition[field].hasOwnProperty('modelArray')) {
            //if we get a VeryModel instance instead of a definition object
            //we have to switch things up
            if (this.definition[field].modelArray instanceof VeryModel) {
                this.definition[field].subModelArray = this.definition[field].modelArray;
                this.definition[field].modelArray = this.definition[field].subModelArray.definition;
            } else {
                //initialize sub model defintion
                this.definition[field].subModelArray = new VeryModel(this.definition[field].modelArray);
            }
        }
    }.bind(this));
}

(function() {

    /* create (optionally with the value object)
     * generates a model for populating, reading, and validating
     * the object over time
     */
    this.create = function (value) {
        var model = new Object;
        model.__defs = this.definition;
        model.__data = {};
        //run through the definition fields
        this.fields.forEach(function(field) {
            //hidden value attribute accessor
            model.__defineGetter__(field, function() {
                if (this.__defs[field].hasOwnProperty('derive')) {
                    this.__data[field] = this.__defs[field].derive(this);
                }
                return this.__data[field];
            }.bind(model));
            //handle assignment to sub models, sub arraymodels, and values differently
            if (model.__defs[field].hasOwnProperty('model')) {
                //recursively instatiate submodel
                model.__data[field] = model.__defs[field].subModel.create();
                model.__data[field].__parent = model;
                //assigning to the submodel should call __loadData on it
                model.__defineSetter__(field, function(value) {
                    this.__data[field].__loadData(value);
                });
            } else if (model.__defs[field].hasOwnProperty('modelArray')) {
                //create an array-like object for a collection of the sub model
                model.__data[field] = new ModelArray(model.__defs[field].subModelArray, model);
            } else {
                //assign the default value to required fields
                //this could get overwritten later at the __loadData phase
                if (model.__defs[field].required) {
                    model.__data[field] = model.__defs[field].default;
                }
                //validate values as they come in
                //hidden value style setter
                model.__defineSetter__(field, function(value) {
                    if ((this.__defs.hasOwnProperty('type') && this.__defs.type.validate(value)) || !this.__defs.hasOwnProperty('type')) {
                        this.__data[field] = value;
                    }
                })
            }
        }.bind(this));


        //load data en masse into the model
        //works recursively
        model.__loadData = function (value) {
            Object.keys(value).forEach(function (key) {
                if (this.__defs[key].hasOwnProperty('modelArray')) {
                    for (var vidx in value[key]) {
                        this.__data[key].push(value[key][vidx]);
                    }
                } else {
                    model[key] = value[key];
                }
            }.bind(this));
        };

        //create a raw Javascript object out of the model data
        //no more helper functions or accessors
        model.__toObject = function () {
            var obj = new Object();
            Object.keys(this.__defs).forEach(function(field) {
                if (this.__defs[field].hasOwnProperty('model')) {
                    obj[field] = this.__data[field].__toObject();
                } else if (this.__defs[field].hasOwnProperty('modelArray')) {
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

        //validate that a model follows the rules and types
        //works recursively
        //returns a list of errors
        //if the list of errors.length === 0, you're golden
        model.__validate = function () {
            var errors = [];
            Object.keys(this.__defs).forEach(function(field) {
                var fidx;
                var merrors;
                //if field is set and dependency is set
                if (this.__data.hasOwnProperty(field) && this.__defs[field].depends) {
                    for (fidx in this.__defs[field].depends) {
                        //check to see if other field is set
                        if (!this.__data.hasOwnProperty(fidx) || this.__data[fidx] === undefined) {
                            errors.push(field + ": Dependency -> " + fidx + ": not set");
                        //check to see if dependency has a validator
                        } else if (this.__defs[field].depends instanceof VeryType) {
                            merrors = this.__defs[field].depends[fidx].validate(this.__data[fidx]);
                            merrors.forEach(function (error) {
                                errors.push(field + ": Dependency  -> " + fidx + ": " + error);
                            });
                        }
                    }
                }
                //if field is reuqired and it's not set
                if (this.__defs[field].required && (!this.__data.hasOwnProperty(field) || this.__data[field] === undefined)) {
                    errors.push(field + ": required");
                }
                //if this field is another model
                //recursively validate it
                //add errors to our own
                if (this.__defs[field].hasOwnProperty('model') && this.__data.hasOwnProperty(field)) {
                    merrors = this.__data[field].__validate();
                    for (var eidx in merrors) {
                        merrors[eidx] = field + '.' + merrors[eidx];
                    }
                    errors = errors.concat(merrors);
                //if field is an array of models
                //recursively validate them
                //and add their errors to our own
                } else if (this.__defs[field].hasOwnProperty('modelArray') && this.__data.hasOwnProperty(field)) {
                    var arrayerrors = [];
                    var idx = 0;
                    this.__data[field].forEach( function (model) {
                        merrors = model.__validate();
                        for (var eidx in merrors) {
                            merrors[eidx] = field + '[' + idx + '].' + merrors[eidx];
                        }
                        errors = errors.concat(merrors);
                        idx += 1;
                    });
                //if we have a VeryType to validate against, validate it
                } else if (this.__data.hasOwnProperty(field) && this.__defs[field].hasOwnProperty('type')) {
                    merrors = this.__defs[field].type.validate(this.__data[field]);
                    merrors.forEach(function (error) {
                        errors.push(field + ": " + error);
                    });
                }

            }.bind(this));
            return errors;
        };

        //generate a JSON string from the model data
        model.__toJSON = function () {
            return JSON.stringify(this.__toObject());
        }
        
        //if model.create passed in initial values, load them
        if (typeof value !== 'undefined') {
            model.__loadData(value);
        }
        

        return model;
    };

}).call(VeryModel.prototype);

module.exports = {
    VeryModel: VeryModel,
    VeryType: function () { return new VeryType; }
};


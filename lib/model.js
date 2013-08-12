var VeryCollection = require('./collection');
var VeryValidator = require('./validator');
var Types = require('./definition').Types;


/* VeryModel, for spawning models out of a definition
 * Instances of VeryModel are factories for models themselves.
 */
function VeryModel(definition, args) {
    args = args || {};
    this.definition = definition;
    this.savecb = args.saveFunction;
    this.loadcb = args.loadFunction;

    //initialize sub model definitions recursively
    this.fields = Object.keys(definition);
    this.fields.forEach(function (field) {
        var submodel;
        if (this.definition[field].hasOwnProperty('model')) {
            //if we get a VeryModel instance instead of a definition object
            //we have to switch things up
            submodel = this.definition[field].model;
            if (submodel === 'this') {
                submodel = this;
            }
            if (submodel instanceof VeryModel) {
                this.definition[field].subModel = submodel;
                this.definition[field].model = this.definition[field].subModel.definition;
            } else {
                //initialize sub VeryModel
                this.definition[field].subModel = new VeryModel(submodel);
            }
        } else if (this.definition[field].hasOwnProperty('collection')) {
            //if we get a VeryModel instance instead of a definition object
            //we have to switch things up
            submodel = this.definition[field].collection;
            if (submodel === 'this') {
                submodel = this;
            }
            if (submodel instanceof VeryModel) {
                this.definition[field].subVeryCollection = submodel;
                this.definition[field].collection = this.definition[field].subVeryCollection.definition;
            } else {
                //initialize sub model defintion
                this.definition[field].subVeryCollection = new VeryModel(submodel);
            }
        }
    }.bind(this));
}

(function () {

    /* create (optionally with the value object)
     * generates a model for populating, reading, and validating
     * the object over time
     */
    this.create = function (value) {
        var model = {};
        model.__verymodel = this;
        model.__defs = this.definition;
        model.__data = {};
        if (Array.isArray(model.__defs)) {
            model.__data = [];
        }
        model.__map = {};
        model.__reverse_map = {};
        model.__primary_key = null;
        model.__creating = true;
        model.__is_empty = true;
        //run through the definition fields
        this.fields.forEach(function (field) {
            //hidden value attribute accessor
            if (typeof model.__defs[field].keyword !== 'undefined') {
                model.__map[model.__defs[field].keyword] = field;
                model.__reverse_map[field] = model.__defs[field].keyword;
                model.__defineGetter__(model.__defs[field].keyword, function () {
                    return model[model.__map[model.__defs[field].keyword]];
                });
            }
            if (model.__defs[field].primary === true) {
                model.__primary_key = field;
            }
            model.__defineGetter__(field, function () {
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
                //assigning to the submodel should call loadData on it
                model.__defineSetter__(field, function (value) {
                    this.__data[field].loadData(value);
                });
            } else if (model.__defs[field].hasOwnProperty('collection')) {
                //create an array-like object for a collection of the sub model
                model.__data[field] = new VeryCollection(model.__defs[field].subVeryCollection, model);
            } else {
                //assign the default value to required fields
                //this could get overwritten later at the loadData phase
                if (model.__defs[field].required) {
                    if (typeof model.__defs[field].default === 'function') {
                        model.__data[field] = model.__defs[field].default(model);
                    } else {
                        model.__data[field] = model.__defs[field].default;
                    }
                }
                //validate values as they come in
                //hidden value style setter
                model.__defineSetter__(field, function (value) {
                    if ((this.__defs.hasOwnProperty('type') && this.__defs.type.validate(value)) || !this.__defs.hasOwnProperty('type')) {
                        if (this.__defs[field].static === true && !this.__creating) {
                            throw new Error('Cannot set static values');
                        }
                        this.__data[field] = value;
                        this.__is_empty = false;
                    }
                });
            }
        }.bind(this));


        //load data en masse into the model
        //works recursively
        model.loadData = function (value) {
            if (Array.isArray(this.__defs)) {
                this.__data = [];
                var valueoff = 0;
                for (var vidx in this.__defs) {
                    if (!this.__defs[vidx].required && value.length + valueoff < this.__defs.length) {
                        if (this.__defs[vidx].default === 'function') {
                            this[vidx] = this.__defs[vidx].default(this);
                        } else {
                            this[vidx] = this.__defs[vidx].default;
                        }
                        valueoff += 1;
                    } else {
                        this[vidx] = value[vidx - valueoff];
                    }
                }
            } else {
                Object.keys(value).forEach(function (key) {
                    if (!this.__defs.hasOwnProperty(key)) return;
                    if (this.__defs[key].hasOwnProperty('collection')) {
                        for (var vidx in value[key]) {
                            this.__is_empty = false;
                            this.__data[key].push(value[key][vidx]);
                        }
                    } else {
                        model.__is_empty = false;
                        model[key] = value[key];
                    }
                }.bind(this));
            }
        };

        //create a raw Javascript object out of the model data
        //no more helper functions or accessors
        model.toObject = function (opts) {
            opts = opts || {};
            var obj;

            if (Array.isArray(this.__defs) && !opts.useKeywords) {
                obj = [];
            } else {
                obj = {};
            }

            Object.keys(this.__defs).forEach(function (field) {
                var key = field;
                if (this.__defs[field].private && !opts.withPrivate) {
                    return;
                }
                if (opts.useKeywords && this.__reverse_map.hasOwnProperty(field)) {
                    key = this.__reverse_map[field];
                }
                if (this.__defs[field].hasOwnProperty('model')) {
                    if (!this.__data[field].__is_empty) {
                        obj[key] = this.__data[field].toObject();
                    }
                } else if (this.__defs[field].hasOwnProperty('collection')) {
                    obj[key] = [];
                    this.__data[field].forEach(function (inst) {
                        if (!inst.__is_empty) {
                            obj[key].push(inst.toObject());
                        }
                    });
                    if (obj[key].length === 0) {
                        delete obj[key];
                    }
                } else {
                    obj[key] = this[field];
                    if (typeof obj[key] === 'undefined') {
                        delete obj[key];
                    }
                }

            }.bind(this));

            return obj;
        };

        //validate that a model follows the rules and types
        //works recursively
        //returns a list of errors
        //if the list of errors.length === 0, you're golden
        model.doValidate = function () {
            var errors = [];
            Object.keys(this.__defs).forEach(function (field) {
                var fidx;
                var merrors;
                //if field is set and dependency is set
                if (this.__data.hasOwnProperty(field) && this.__defs[field].depends) {
                    for (fidx in this.__defs[field].depends) {
                        //check to see if other field is set
                        if (!this.__data.hasOwnProperty(fidx) || this.__data[fidx] === undefined) {
                            errors.push(field + ": Dependency -> " + fidx + ": not set");
                        //check to see if dependency has a validator
                        } else if (this.__defs[field].depends instanceof VeryValidator) {
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
                //only if the submodule is required or has been populated
                if (this.__defs[field].hasOwnProperty('model') && this.__data.hasOwnProperty(field) && (!this.__data[field].__is_empty || this.__defs[field].required)) {
                    merrors = this.__data[field].doValidate();
                    for (var eidx in merrors) {
                        merrors[eidx] = field + '.' + merrors[eidx];
                    }
                    errors = errors.concat(merrors);
                //if field is an array of models
                //recursively validate them
                //and add their errors to our own
                } else if (this.__defs[field].hasOwnProperty('collection') && this.__data.hasOwnProperty(field)) {
                    var arrayerrors = [];
                    var idx = 0;
                    this.__data[field].forEach(function (model) {
                        //is this collection required? has the model been populated?
                        if (this.__defs[field].required || !model.__is_empty) {
                            merrors = model.doValidate();
                            for (var eidx in merrors) {
                                merrors[eidx] = field + '[' + idx + '].' + merrors[eidx];
                            }
                            errors = errors.concat(merrors);
                        }
                        idx += 1;
                    }.bind(this));
                //if we have a VeryValidator to validate against, validate it
                } else if (this.__data.hasOwnProperty(field) && this.__defs[field].hasOwnProperty('type')) {
                    if (typeof this.__defs[field].type === 'string' && Types.hasOwnProperty(this.__defs[field].type)) {
                        this.__defs[field].type = Types[this.__defs[field].type];
                    }
                    merrors = this.__defs[field].type.validate(this.__data[field]);
                    merrors.forEach(function (error) {
                        errors.push(field + ": " + error);
                    });
                } else if (this.__data.hasOwnProperty(field) && this.__defs[field].hasOwnProperty('array')) {
                    var tidx = 0;
                    this.__defs[field].array.forEach(function (type) {
                        merrors = type.validate(this.__data[field][tidx]);
                        merrors.forEach(function (error) {
                            errors.push(field + "[" + tidx + "]: " + error);
                        });
                        tidx++;
                    }.bind(this));
                }

            }.bind(this));
            return errors;
        };
        
        model.makeClone = function () {
            return this.__verymodel.create(this.toObject());
        };

        //generate a JSON string from the model data
        model.toJSON = function (args) {
            return JSON.stringify(this.toObject(args));
        };

        model.doSave = function (cb) {
            this.__verymodel.savecb(this, cb);
        };
        
        //if model.create passed in initial values, load them
        if (typeof value !== 'undefined') {
            model.loadData(value);
        }

        model.__creating = false;

        return model;
    };
    
    this.setSave = function (savecb) {
        this.savecb = savecb;
    };

    this.setLoad = function (loaddb) {
        this.loaddb = loaddb;
    };

    this.load = function (id, cb) {
        this.loaddb(id, cb);
    };


}).call(VeryModel.prototype);


module.exports = VeryModel;

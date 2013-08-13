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
        this.setupField(field);
    }.bind(this));
}

(function () {

    this.inherit = function (parentModel) {
        var fields = parentModel.fields;

        fields.forEach(function _inheritField(field) {
            if (this.definition[field]) return;

            this.fields.push(field);
            this.definition[field] = parentModel.definition[field];

            this.setupField(field);
        }.bind(this));
    };

    this.setupField = function (field) {
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
    };

    /* create (optionally with the value object)
     * generates a model for populating, reading, and validating
     * the object over time
     */
    this.create = function (value) {
        var model = {};
        
        var meta = model.__verymeta = {
            model: this,
            defs: this.definition,
            data: {},
            map: {},
            reverseMap: {},
            primaryKey: null,
            creating: true,
            isEmpty: true
        };

        if (Array.isArray(meta.defs)) {
            meta.data = [];
        }

        //run through the definition fields
        this.fields.forEach(function _createField(field) {

            //hidden value attribute accessor
            if (typeof meta.defs[field].keyword !== 'undefined') {
                meta.map[meta.defs[field].keyword] = field;
                meta.reverseMap[field] = meta.defs[field].keyword;
                model.__defineGetter__(meta.defs[field].keyword, function () {
                    return model[meta.map[meta.defs[field].keyword]];
                });
            }

            if (meta.defs[field].primary === true) {
                meta.primaryKey = field;
            }

            model.__defineGetter__(field, function () {
                var meta = this.__verymeta;
                if (meta.defs[field].hasOwnProperty('derive')) {
                    meta.data[field] = meta.defs[field].derive(this);
                }
                return meta.data[field];
            }.bind(model));


            //handle assignment to sub models, sub arraymodels, and values differently
            if (meta.defs[field].hasOwnProperty('model')) {
                //recursively instatiate submodel
                meta.data[field] = meta.defs[field].subModel.create();
                meta.data[field].__verymeta.parent = model;

                //assigning to the submodel should call loadData on it
                model.__defineSetter__(field, function (value) {
                    this.__verymeta.data[field].loadData(value);
                });

                return;
            }
            
            if (meta.defs[field].hasOwnProperty('collection')) {
                //create an array-like object for a collection of the sub model
                meta.data[field] = new VeryCollection(meta.defs[field].subVeryCollection, model);

                return;
            } 

            //assign the default value to required fields
            //this could get overwritten later at the loadData phase
            if (meta.defs[field].required) {
                if (typeof meta.defs[field].default === 'function') {
                    meta.data[field] = meta.defs[field].default(model);
                } else {
                    meta.data[field] = meta.defs[field].default;
                }
            }

            //validate values as they come in
            //hidden value style setter
            model.__defineSetter__(field, function (value) {
                var meta = this.__verymeta;

                if (meta.defs[field].static === true && !meta.creating) {
                    throw new Error('Cannot set static values');
                }

                meta.data[field] = value;
                meta.isEmpty = false;
            });
        }.bind(this));


        //load data en masse into the model
        //works recursively
        model.loadData = function (value) {
            var meta = this.__verymeta;

            if (Array.isArray(meta.defs)) {
                meta.data = [];
                var valueoff = 0;
                for (var vidx in meta.defs) {
                    if (!meta.defs[vidx].required && value.length + valueoff < meta.defs.length) {
                        if (meta.defs[vidx].default === 'function') {
                            this[vidx] = meta.defs[vidx].default(this);
                        } else {
                            this[vidx] = meta.defs[vidx].default;
                        }
                        valueoff += 1;
                    } else {
                        this[vidx] = value[vidx - valueoff];
                    }
                }
            } else {
                Object.keys(value).forEach(function (key) {
                    if (!meta.defs.hasOwnProperty(key)) return;

                    if (meta.defs[key].hasOwnProperty('collection')) {
                        for (var vidx in value[key]) {
                            meta.isEmpty = false;
                            meta.data[key].push(value[key][vidx]);
                        }
                    } else {
                        meta.isEmpty = false;
                        model[key] = value[key];
                    }
                }.bind(this));
            }
        };

        //create a raw Javascript object out of the model data
        //no more helper functions or accessors
        model.toObject = function (opts) {
            opts = opts || {};

            var meta = this.__verymeta;
            var obj;

            if (Array.isArray(meta.defs) && !opts.useKeywords) {
                obj = [];
            } else {
                obj = {};
            }

            Object.keys(meta.defs).forEach(function (field) {
                var key = field;
                if (meta.defs[field].private && !opts.withPrivate) {
                    return;
                }

                if (opts.useKeywords && meta.reverseMap.hasOwnProperty(field)) {
                    key = meta.reverseMap[field];
                }

                if (meta.defs[field].hasOwnProperty('model')) {
                    if (!meta.data[field].__verymeta.isEmpty) {
                        obj[key] = meta.data[field].toObject();
                    }
                    return;
                }
                
                if (meta.defs[field].hasOwnProperty('collection')) {
                    obj[key] = [];
                    meta.data[field].forEach(function (inst) {
                        if (!inst.__verymeta.isEmpty) {
                            obj[key].push(inst.toObject());
                        }
                    });
                    if (obj[key].length === 0) {
                        delete obj[key];
                    }

                    return;
                }

                obj[key] = this[field];
                if (typeof obj[key] === 'undefined') {
                    delete obj[key];
                }
            }.bind(this));

            return obj;
        };

        //validate that a model follows the rules and types
        //works recursively
        //returns a list of errors
        //if the list of errors.length === 0, you're golden
        model.doValidate = function () {
            var meta = this.__verymeta;
            var errors = [];

            Object.keys(meta.defs).forEach(function (field) {
                var fidx;
                var merrors;
                //if field is set and dependency is set
                if (meta.data.hasOwnProperty(field) && meta.defs[field].depends) {
                    for (fidx in meta.defs[field].depends) {
                        //check to see if other field is set
                        if (!meta.data.hasOwnProperty(fidx) || meta.data[fidx] === undefined) {
                            errors.push(field + ": Dependency -> " + fidx + ": not set");
                        //check to see if dependency has a validator
                        } else if (meta.defs[field].depends instanceof VeryValidator) {
                            merrors = meta.defs[field].depends[fidx].validate(meta.data[fidx]);
                            merrors.forEach(function (error) {
                                errors.push(field + ": Dependency  -> " + fidx + ": " + error);
                            });
                        }
                    }
                }
                //if field is reuqired and it's not set
                if (meta.defs[field].required && (!meta.data.hasOwnProperty(field) || meta.data[field] === undefined)) {
                    errors.push(field + ": required");
                }
                //if this field is another model
                //recursively validate it
                //add errors to our own
                //only if the submodule is required or has been populated
                if (meta.defs[field].hasOwnProperty('model') && meta.data.hasOwnProperty(field) && (!meta.data[field].__verymeta.isEmpty || meta.defs[field].required)) {
                    merrors = meta.data[field].doValidate();
                    for (var eidx in merrors) {
                        merrors[eidx] = field + '.' + merrors[eidx];
                    }
                    errors = errors.concat(merrors);
                //if field is an array of models
                //recursively validate them
                //and add their errors to our own
                } else if (meta.defs[field].hasOwnProperty('collection') && meta.data.hasOwnProperty(field)) {
                    var arrayerrors = [];
                    var idx = 0;
                    meta.data[field].forEach(function (model) {
                        //is this collection required? has the model been populated?
                        if (meta.defs[field].required || !model.__verymeta.isEmpty) {
                            merrors = model.doValidate();
                            for (var eidx in merrors) {
                                merrors[eidx] = field + '[' + idx + '].' + merrors[eidx];
                            }
                            errors = errors.concat(merrors);
                        }
                        idx += 1;
                    }.bind(this));
                //if we have a VeryValidator to validate against, validate it
                } else if (meta.data.hasOwnProperty(field) && meta.defs[field].hasOwnProperty('type')) {
                    if (typeof meta.defs[field].type === 'string' && Types.hasOwnProperty(meta.defs[field].type)) {
                        meta.defs[field].type = Types[meta.defs[field].type];
                    }
                    merrors = meta.defs[field].type.validate(meta.data[field]);
                    merrors.forEach(function (error) {
                        errors.push(field + ": " + error);
                    });
                } else if (meta.data.hasOwnProperty(field) && meta.defs[field].hasOwnProperty('array')) {
                    var tidx = 0;
                    meta.defs[field].array.forEach(function (type) {
                        merrors = type.validate(meta.data[field][tidx]);
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
            return this.__verymeta.model.create(this.toObject());
        };

        //generate a JSON string from the model data
        model.toJSON = function (args) {
            return JSON.stringify(this.toObject(args));
        };

        model.doSave = function (cb) {
            this.__verymeta.model.savecb(this, cb);
        };
        
        //if model.create passed in initial values, load them
        if (typeof value !== 'undefined') {
            model.loadData(value);
        }

        meta.creating = false;

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

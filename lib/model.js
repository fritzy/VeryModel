var VeryCollection = require('./collection');
var VeryValidator = require('./validator');
var Types = require('./definition').Types;
var underscore = require('underscore');


/* VeryModel, for spawning models out of a definition
 * Instances of VeryModel are factories for models themselves.
 */
function VeryModel(definition, options) {
    if (Array.isArray(definition)) {
        this.definition = [];
    } else {
        this.definition = {};
    }
    this.controllers = {};
    this.options = {};

    //initialize sub model definitions recursively
    this.fields = [];
    this.addDefinition(definition);
    this.addOptions(options);
}

(function () {

    function merge(a, b) {
        Object.keys(b).forEach(function (key) {
            if (key !== 'type' && typeof b[key] === 'object' && !Array.isArray(b[key]) && !(b[key] instanceof VeryModel)) {
                if (!a.hasOwnProperty(key)) {
                    a[key] = {};
                }
                merge(a[key], b[key]);
            } else {
                a[key] = b[key];
            }
        });
    }

    this.addDefinition = function (defs) {
        var newfields = Object.keys(defs);
        if (!Array.isArray(this.definition)) {
            merge(this.definition, defs);
        } else {
            this.definition = this.definition.concat(defs);
        }
        this.fields = underscore.union(newfields, this.fields);
        newfields.forEach(function (field) {
            this.setupField(field);
        }.bind(this));
    };

    this.addOptions = function (options) {
        if (!underscore.isObject(options)) return;
        underscore.extend(this.options, options);
    };

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
    this.create = function (value, ctx) {
        var model = {};
        var meta = {};
        
        model.ctx = ctx;
        
        underscore.extend(meta, this.options, {
            model: this,
            defs: this.definition,
            data: {},
            old_data: {},
            map: {},
            reverseMap: {},
            primaryKey: null,
            creating: true,
            isEmpty: true
        });

        model.__verymeta = meta;

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
                    model[field] = meta.defs[field].derive.call(this, this);
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
                    this.__verymeta.data[field].loadData(value, false);
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
                    meta.data[field] = meta.defs[field].default.call(model, model);
                } else {
                    meta.data[field] = meta.defs[field].default;
                }
            }

            //hidden value style setter
            model.__defineSetter__(field, function (value) {
                var meta = this.__verymeta;

                if (meta.defs[field].static === true && !meta.creating) {
                    throw new Error('Cannot set static values');
                }
                
                if (typeof meta.data[field] !== 'undefined' && value !== meta.data[field] && !meta.old_data.hasOwnProperty(field)) {
                    meta.old_data[field] = meta.data[field];
                }

                meta.data[field] = value;

                meta.isEmpty = false;
            });
        }.bind(this));

        model.getOldModel = function () {
            var data = model.toJSON();
            var old_fields = Object.keys(model.__verymeta.old_data);
            for (var idx in old_fields) {
                data[old_fields[idx]] = model.__verymeta.old_data[old_fields[idx]];
            }
            return model.__verymeta.model.create(data);
        };

        model.getChanges = function () {
            var diff = {};
            for (var idx in meta.model.fields) {
                if (meta.old_data.hasOwnProperty(meta.model.fields[idx])) {
                    diff[meta.model.fields[idx]] = {then: meta.old_data[meta.model.fields[idx]], now: meta.data[meta.model.fields[idx]], changed: true};
                } else {
                    diff[meta.model.fields[idx]] = {then: meta.data[meta.model.fields[idx]], now: meta.data[meta.model.fields[idx]], changed: false};
                }
            }
            return diff;
        };

        model.diff = function (other) {
            var diff = {};
            var fields = Object.keys(model.__verymeta.data);
            for (var idx in fields) {
                diff[fields[idx]] = {'left': model.__verymeta.data[fields[idx]], right: other.__verymeta.data[fields[idx]]};
            }
            return diff;

        };

        //load data en masse into the model
        //works recursively
        model.loadData = function (value, process) {
            process = process !== false;
            var meta = this.__verymeta;
            var processIn;

            if (Array.isArray(meta.defs)) {
                meta.data = [];
                var valueoff = 0;
                for (var vidx in meta.defs) {
                    processIn = process && meta.defs[vidx].processIn && typeof meta.defs[vidx].processIn === 'function' ? meta.defs[vidx].processIn.bind(this) : false;
                    if (!meta.defs[vidx].required && value.length + valueoff < meta.defs.length) {
                        if (meta.defs[vidx].default === 'function') {
                            this[vidx] = meta.defs[vidx].default(this);
                        } else {
                            this[vidx] = meta.defs[vidx].default;
                        }
                        valueoff += 1;
                    } else {
                        if (processIn) {
                            this[vidx] = processIn(value[vidx - valueoff]).bind(this);
                        } else {
                            this[vidx] = value[vidx - valueoff];
                        }
                    }
                }
            } else {
                Object.keys(value).forEach(function (key) {
                    if (meta.defs.hasOwnProperty(key)) {
                        processIn = process && meta.defs[key].processIn && typeof meta.defs[key].processIn === 'function' ? meta.defs[key].processIn.bind(this) : false;

                        if (meta.defs[key].hasOwnProperty('collection')) {
                            for (var vidx in value[key]) {
                                meta.isEmpty = false;
                                if (processIn) {
                                    meta.data[key].push(processIn(value[key][vidx]));
                                } else {
                                    meta.data[key].push(value[key][vidx]);
                                }
                            }
                        } else if (meta.defs[key].hasOwnProperty('model') && meta.creating) {
                            meta.data[key].loadData(value[key]);
                        } else {
                            meta.isEmpty = false;
                            if (processIn) {
                                model[key] = processIn(value[key]);
                            } else {
                                model[key] = value[key];
                            }
                        }
                    }
                }.bind(this));
            }
        };

        //create a JSON serializable Javascript object out of the model data
        //no more helper functions or accessors
        model.toJSON = function (opts) {
            opts = opts || {};

            var meta = this.__verymeta;
            var obj;

            if (Array.isArray(meta.defs) && !opts.useKeywords) {
                obj = [];
            } else {
                obj = {};
            }

            Object.keys(meta.defs).forEach(function (field) {
                var processOut = meta.defs[field].processOut && typeof meta.defs[field].processOut === 'function' ? meta.defs[field].processOut.bind(this) : false;
                var key = field;
                if (meta.defs[field].private && !opts.withPrivate) {
                    return;
                }

                if (opts.useKeywords && meta.reverseMap.hasOwnProperty(field)) {
                    key = meta.reverseMap[field];
                }

                if (meta.defs[field].hasOwnProperty('model')) {
                    if (!meta.data[field].__verymeta.isEmpty) {
                        obj[key] = meta.data[field].toJSON();
                    }
                    return;
                }
                
                if (meta.defs[field].hasOwnProperty('collection')) {
                    obj[key] = [];
                    meta.data[field].forEach(function (inst) {
                        if (!inst.__verymeta.isEmpty) {
                            obj[key].push(inst.toJSON());
                        }
                    });
                    if (obj[key].length === 0) {
                        delete obj[key];
                    }

                    return;
                }

                obj[key] = processOut ? processOut(this[field]) : this[field];
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
                    if (typeof merrors === 'boolean') {
                        if (merrors) {
                            merrors = [];
                        } else {
                            merrors = ["Failed."];
                        }
                    }
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
            return this.__verymeta.model.create(this.toJSON());
        };

        //generate a JSON string from the model data
        model.toString = function (args) {
            return JSON.stringify(this.toJSON(args));
        };
        
        //extend controllers
        Object.keys(this.controllers).forEach(function (controller) {
            model[controller] = this.controllers[controller];
        }.bind(this));

        //if model.create passed in initial values, load them
        if (typeof value !== 'undefined') {
            model.loadData(value);
        }

        meta.creating = false;

        return model;
    };
    
    this.extendModel = function (controllers) {
        this.controllers = underscore.extend(this.controllers, controllers);
    };

    this.addModelVar = function (name, value) {
        this.controllers[name] = value;
    };


}).call(VeryModel.prototype);


module.exports = VeryModel;

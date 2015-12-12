var VeryCollection = require('./collection');
var coreTypes = require('./definition');
var lodash = require('lodash');
var joi = require('joi');

var model_cache = {};
function getErrors(field, errors) {
    if (Array.isArray(errors)) {
        var results = [];
        errors.forEach(function (error) {
            var result = getErrors(field, error);
            if (!Array.isArray(result)) {
                results.push(result);
            }
        });
        errors = results;
    }
    if (typeof errors === 'boolean') {
        if (errors) {
            errors = [];
        } else {
            errors = ["Failed."];
        }
    }
    if (typeof errors === 'object' && errors.hasOwnProperty('error')) {
        if (errors.error === null) {
            errors = [];
        } else {
            errors = [errors.error];
        }
    }
    if (!Array.isArray(errors)) {
        errors = [errors];
    }
    return errors;
}


/* VeryModel, for spawning models out of a definition
 * Instances of VeryModel are factories for models themselves.
 */
function VeryModel(definition, options) {
    if (!(this instanceof VeryModel)) {
        throw new Error("You must invoke VeryModel with `new`, not as a function call.");
    }
    if (Array.isArray(definition)) {
        this.definition = [];
    } else {
        this.definition = {};
    }
    this.primary = null;
    this.controllers = {};
    this.options = {};

    //initialize sub model definitions recursively
    this.fields = [];
    this.map = {};
    this.alias = {};
    this.addDefinition(definition);
    this.addOptions(options);
}

(function () {

    function merge(a, b) {
        Object.keys(b).forEach(function (key) {
            if (key !== 'type' && typeof b[key] === 'object' && !Array.isArray(b[key]) && !(b[key] instanceof VeryModel) && key !== 'validate') {
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
        this.fields = lodash.union(newfields, this.fields);
        newfields.forEach(function (field) {
            this.setupField(field);
        }.bind(this));
    };

    this.addOptions = function (options) {
        if (!lodash.isObject(options)) return;
        lodash.extend(this.options, options);
        if (this.options.cache === true && this.options.hasOwnProperty('name')) {
            model_cache[this.options.name] = this;
        }
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

    this.getModel = function (modelRef) {
        if (typeof modelRef === 'string') {
            if (modelRef === 'this') {
                return this;
            } else if (model_cache.hasOwnProperty(modelRef)) {
                return model_cache[modelRef];
            } else {
                return false;
            }
        } else if (modelRef instanceof VeryModel) {
            return modelRef;
        } else if (typeof modelRef === 'object') {
            return new VeryModel(modelRef);
        }
    };

    this.setupField = function (field) {
        var submodel;
        if (this.definition[field].hasOwnProperty('model')) {
            submodel = this.getModel(this.definition[field].model) || this.definition[field].model;
            if (submodel instanceof VeryModel) {
                this.definition[field].subModel = submodel;
            } else if (typeof submodel === 'string') {
                this.definition[field].deferredModel = submodel;
            } else {
                this.definition[field].subModel = new VeryModel(submodel);
                this.definition[field].model = this.definition[field].subModel.definition;
            }
        } else if (this.definition[field].hasOwnProperty('collection')) {
            submodel = this.getModel(this.definition[field].collection) || this.definition[field].collection;
            if (submodel instanceof VeryModel) {
                this.definition[field].subVeryCollection = submodel;
            } else if (typeof submodel === 'string') {
                this.definition[field].deferredCollection = submodel;
            } else {
                this.definition[field].subVeryCollection = new VeryModel(submodel);
                this.definition[field].collection = this.definition[field].subVeryCollection.definition;
            }
        }
        if (typeof this.definition[field].type !== 'undefined' && typeof this.definition[field].type !== 'string') {
            this.definition[field].validate = this.definition[field].type;
            delete this.definition[field].type;
        } else if (typeof this.definition[field].type === 'string') {
            if (coreTypes.types.hasOwnProperty(this.definition[field].type)) {
                this.definition[field] = coreTypes.wrapType(coreTypes.types[this.definition[field].type], this.definition[field]);
            }
        }
        if (typeof this.definition[field].alias === 'string') {
            this.map[this.definition[field].alias] = field;
            this.alias[field] = this.definition[field].alias;
            this.map[field] = field;
        } else {
            this.map[field] = field;
            this.alias[field] = field;
        }
        if (this.definition[field].primary === true) {
            this.primary = field;
        }
    };

    this.getField = function (field) {
        return this.map[field];
    };

    this.getDefinition = function (field) {
        return this.definition[this.map[field]];
    };

    this.exportJoi = function (fields, unknown) {
        var meta = this.__verymeta;
        if (typeof fields === 'undefined') {
            fields = lodash.clone(this.fields);
        }
        var objfields = {};
        if (!Array.isArray(fields)) {
            objfields = fields;
            fields = objfields.root || lodash.clone(this.fields);
        }
        var obj = {};
        var peersWith = {};
        fields.forEach(function (field) {
            if (this.definition[field].hasOwnProperty('deferredModel')) {
                this.defs[field].subModel = this.getModel(this.definitions[field].deferredModel);
            }
            if (this.definition[field].hasOwnProperty('defferedCollection')) {
                this.definition[field].subVeryCollection = this.getModel(meta.defs[field].deferredCollection);
            }
            if (this.definition[field].hasOwnProperty('depends')) {
                peersWith[field] = this.definition[field].depends;
            }
            if (this.definition[field].hasOwnProperty('validate') && this.definition[field].validate.isJoi) {
                obj[field] = this.definition[field].validate;
            } else if (this.definition[field].hasOwnProperty('subModel')) {
                obj[field] = this.definition[field].subModel.exportJoi(objfields[field]);
            } else if (this.definition[field].hasOwnProperty('subVeryCollection')) {
                obj[field] = joi.array().items(this.definition[field].subVeryCollection.exportJoi(objfields[field]));
            }
        }.bind(this));
        var joiObj;
        if (Array.isArray(this.definition)) {
            var values = [];
            Object.keys(obj).forEach(function (k) {
                values.push(obj[k]);
            });
            joiObj = joi.array().ordered(values);
        } else {
            joiObj = joi.object(obj).unknown(unknown);
        }
        Object.keys(peersWith).forEach(function (field) {
            joiObj.with(field, peersWith[field]);
        });
        return joiObj;
    };

    /* create (optionally with the value object)
     * generates a model for populating, reading, and validating
     * the object over time
     */
    this.create = function (value, ctx) {
        var model = {};
        var meta = {};
        var obj;
        var factory = this;

        model.ctx = ctx;

        lodash.extend(meta, this.options, {
            model: this,
            defs: this.definition,
            data: {},
            old_data: {},
            map: {},
            reverseMap: {},
            primary: this.primary,
            creating: true,
            isEmpty: true
        });

        model.__verymeta = meta;

        if (Array.isArray(meta.defs)) {
            meta.data = [];
        }

        //run through the definition fields
        Object.keys(this.map).forEach(function _createField(field) {
            var submodel;
            var def = this.getDefinition(field);
            var mapfield = this.map[field];

            if (def.hasOwnProperty('deferredCollection')) {
                submodel = this.getModel(def.deferredCollection);
                def.subVeryCollection = submodel;
                def.collection = def.subVeryCollection.definition;
                delete def.deferredCollection;
            } else if (def.hasOwnProperty('deferredModel')) {
                submodel = this.getModel(def.deferredModel);
                this.definition[field].subModel = submodel;
                this.definition[field].model = submodel.definition;
                delete def.deferredModel;
                delete this.definition[field].deferredModel;
            }

            //hidden value attribute accessor
            if (typeof def.alias !== 'undefined') {
                meta.reverseMap[field] = def.alias;
            }

            model.__defineGetter__(field, function () {
                var meta = this.__verymeta;
                if (def.hasOwnProperty('derive')) {
                    model[mapfield] = def.derive.call(this, this);
                }
                return meta.data[mapfield];
            }.bind(model));


            //handle assignment to sub models, sub arraymodels, and values differently
            if (def.hasOwnProperty('model')) {
                //recursively instatiate submodel
                meta.data[mapfield] = def.subModel.create();
                meta.data[mapfield].__verymeta.parent = model;

                //assigning to the submodel should call loadData on it
                model.__defineSetter__(field, function (value) {
                    if (typeof value === 'object' && value.hasOwnProperty('__verymeta')) {
                        this.__verymeta.data[mapfield] = value;
                    } else {
                        this.__verymeta.data[mapfield].loadData(value, false);
                    }
                });

                return;
            }

            if (def.hasOwnProperty('collection')) {
                //create an array-like object for a collection of the sub model
                meta.data[mapfield] = new VeryCollection(def.subVeryCollection, model);
                
                model.__defineSetter__(field, function (value) {
                    if (Array.isArray(value)) {
                        this.__verymeta.data[mapfield].assign(value);
                    } else {
                        this.__verymeta.data[mapfield].push(value);
                    }
                });

                return;
            }

            //assign the default value
            //this could get overwritten later at the loadData phase
            if (typeof def.default === 'function') {
                meta.data[mapfield] = def.default.call(model, model);
            } else {
                meta.data[mapfield] = def.default;
            }

            //hidden value style setter
            model.__defineSetter__(field, function (value) {
                var meta = this.__verymeta;

                if (def.static === true && !meta.creating) {
                    throw new Error('Cannot set static values');
                }

                if (typeof meta.data[mapfield] !== 'undefined' && value !== meta.data[mapfield] && !meta.old_data.hasOwnProperty(mapfield)) {
                    meta.old_data[mapfield] = meta.data[mapfield];
                }

                if (!meta.creating && typeof def.onSet === 'function') {
                    value = def.onSet.call(model, value);
                }


                meta.data[mapfield] = value;

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

        model.isSet = function (field) {
            return (typeof meta.data[field] !== 'undefined');
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
                    if (processIn) {
                        this[vidx] = processIn(value[vidx - valueoff]).bind(this);
                    } else {
                        this[vidx] = value[vidx - valueoff];
                    }
                }
            } else {
                Object.keys(value).forEach(function (key) {
                    var mapkey = factory.map[key];
                    var def = factory.getDefinition(key);
                    if (!def) {
                        return;
                    }
                    processIn = process && def.processIn && typeof def.processIn === 'function' ? def.processIn.bind(this) : false;

                    if (def.hasOwnProperty('collection')) {
                        for (var vidx in value[key]) {
                            meta.isEmpty = false;
                            if (processIn) {
                                meta.data[mapkey].push(processIn(value[key][vidx]));
                            } else {
                                meta.data[mapkey].push(value[key][vidx]);
                            }
                        }
                    } else if (def.hasOwnProperty('model') && meta.creating) {
                        meta.data[mapkey].loadData(value[key]);
                    } else {
                        meta.isEmpty = false;
                        if (processIn) {
                            model[mapkey] = processIn(value[key]);
                        } else {
                            model[mapkey] = value[key];
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

            if (!opts.hasOwnProperty('useAliases') && meta.toJSONUseAliases) {
                opts.useAliases = true;
            }

            if (Array.isArray(meta.defs) && !opts.useAliases) {
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

                if (opts.useAliases && meta.reverseMap.hasOwnProperty(field)) {
                    key = meta.defs[field].alias;
                }

                if (!opts.noDepth && meta.defs[field].hasOwnProperty('model')) {
                    if (!meta.data[field].__verymeta.isEmpty) {
                        obj[key] = meta.data[field].toJSON();
                    }
                    return;
                } else if (!opts.noDepth && typeof meta.data[field] === 'object' && meta.data[field] !== null && meta.data[field].hasOwnProperty('toJSON')) {
                    obj[key] = meta.data[field].toJSON();
                    return;
                }

                if (!opts.noDepth && meta.defs[field].hasOwnProperty('collection')) {
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
                } else if (!opts.noDepth && Array.isArray(meta.data[field])) {
                    obj[key] = [];
                    meta.data[field].forEach(function (value) {
                        if (typeof value === 'object' && value.hasOwnProperty('toJSON')) {
                            obj[key].push(value.toJSON());
                        } else {
                            obj[key].push(value);
                        }
                    });
                    return;
                }

                obj[key] = processOut ? processOut(this[field]) : this[field];
                if (typeof obj[key] === 'undefined') {
                    delete obj[key];
                }
            }.bind(this));

            return obj;
        };

        model.doValidate = function () {
            var validate = this.__verymeta.model.exportJoi();
            var json = this.toJSON();
            var error = validate.validate(json);
            return error;
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
        //model.loadData(value);

        meta.creating = false;

        return model;
    };

    this.extendModel = function (controllers) {
        this.controllers = lodash.extend(this.controllers, controllers);
    };

    this.addModelVar = function (name, value) {
        this.controllers[name] = value;
    };


}).call(VeryModel.prototype);


module.exports = VeryModel;

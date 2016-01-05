'use strict';

const lodash = require('lodash');
const joi = require('joi');
const instancePrototype = require('./instance');
const defSpec = require('./definition');
const Types = require('./types');

const modelCache = new Map();

function getModel(input) {
  if (input.isVeryModel) {
    return input;
  }
  return modelCache.get(input) || null;
}

function Model(name, definition, options) {

  const model = this;
  modelCache.set(name, this);
  this.name = name;
  this.definition = new Map();
  this.options = options || {};
  this.fields = new Set();
  this.subModel = {};
  this.fieldMap = {};
  this.isVeryModel = true;
  this.defaults = {};

  this.Instance = function Instance(value, opts) {

    opts = opts || {};
    opts.processors = opts.processors || [];
    opts.processors.push('create');
    this.__factory = model;
    this.__data = this.__factory.getDefaults();
    this.__isEmpty = true;
    this.__loadData(value, opts);
    Object.seal(this);
  };
  this.Instance.prototype = Object.create(instancePrototype);
  this.Instance.constructor = this.Instance;

  this.addDefinition(definition);
}

Model.prototype = {
  create: function (value, options) {

    return new this.Instance(value, options);
  },

  getDefaults: function () {

    const output = {};
    Object.keys(this.fields).forEach((field) => {
      const def = this.definition.get(field);
      if (def.model) {
        output[field] = new getModel(def.model).Instance({});
      }
      if (def.collection) {
        output[field] = [];
      }
    });
    Object.keys(this.defaults).forEach((field) => {
      if (typeof this.defaults[field] === 'function') {
        output[field] = this.defaults[field]();
      } else {
        output[field] = this.defaults[field];
      }
    });
    return output;
  },

  extendFactory: function () {

  },
  extendInstance: function () {

  },

  addDefinition: function (defs) {

    Object.keys(defs).forEach((field) => {

      const def = lodash.assign(defSpec.baseDefinition, defs[field]);
      if (def.type) {
        lodash.assign(def, Types.types[def.type]);
      }
      joi.assert(def, defSpec.validation);
      if (this.fields.has(field)) {
        throw new Error(`VeryModel definition conflict. ${this.name} already has a field defined called ${field}`);
      }
      this.fields.add(field);
      this.fieldMap[field] = field;
      this.defaults[field] = def.default;

      if (typeof def.alias === 'string') {
        this.fieldMap[def.alias] = field;
      }

      const subModel = def.model || def.collection;

      if (subModel) {
        if (subModel.isVeryModel) {
          this.subModel[field] = subModel;
        } else if (typeof subModel === 'string') {
          this.subModel[field] = getModel(subModel);
        } else if (typeof subModel === 'object') {
          this.subModel[field] = new Model(field, subModel);
        }
      }

      if (def.collection) {
        this.defaults[field] = [];
      }

      const getFunc = function () {
        return this.__process(field, this.__data[field], ['get']);
      };

      const setFunc = function (value) {
        return this.__set(field, value, ['set']);
      };

      Object.defineProperty(this.Instance.prototype, field, {
        set: setFunc,
        get: getFunc
      });

      if (typeof def.alias === 'string') {
        Object.defineProperty(this.Instance.prototype, def.alias, {
          set: setFunc,
          get: getFunc
        });
      }

      this.definition.set(field, def);
    });
  },

  exportJoi: function (opts, depth) {

    opts = opts || {};
    opts.unknown = !!opts.unknown;
    depth = depth || 0;
    opts.depth = opts.depth || 5;
    if (depth > opts.depth) {
      return;
    }
    depth++;

    models = models || new Set();
    if (models.has(this.name)) {
      return;
    }
    models.add(this.name);
    fields = fields || this.fields;
    const obj = {};
    const joiobj = joi.object();
    fields.forEach((field) => {
      field = this.fieldMap[field];
      const def = this.definition.get(field);
      if (def.model) {
        obj[field] = getModel(def.model).exportJoi(opts, depth);
      } else if (def.collection) {
        obj[field] = joi.array().items(getModel(def.collection).exportJoi(opts, depth));
      } else {
        obj[field] = def.validate;
      }
    });
    joiobj.keys(obj);
    if (typeof this.options.peers === 'object') {
      if (this.options.peers.and) {
        joiobj.and(this.options.peers.and);
      }
      if (this.options.peers.nand) {
        joiobj.nand(this.options.peers.nand);
      }
      if (this.options.peers.or) {
        joiobj.or(this.options.peers.or);
      }
      if (this.options.peers.xor) {
        joiobj.xor(this.options.peers.xor);
      }
      if (this.options.peers.with) {
        Object.keys(this.options.peers.with).forEach((key) => {
          joiobj.with(key, this.options.peers.with[key]);
        });
      }
      if (this.options.peers.without) {
        Object.keys(this.options.peers.without).forEach((key) => {
          joiobj.without(key, this.options.peers.without[key]);
        });
      }
    }
    joiobj.unknown(opts.unknown);
    return joiobj;
  },
  getModel
};

module.exports = {
  Model,
  getModel
};

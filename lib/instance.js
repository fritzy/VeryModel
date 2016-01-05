'use strict';

module.exports = {

  __loadData: function (values, options) {

    options = options || {};
    options.processors = options.processors || [];
    Object.keys(values).forEach((field) => {
      this.__set(field, value, options.processors);
    });
  },

  __process: function (field, value, processors) {

    const def = this.__factory.definition.get(field);
    for (const name of processors) {
      if (def.processors[name]) {
        value = def.processors[name].call(this, value);
      }
    }
    return value;
  },

  __set: function (field, value, processors) {

    field = this.__factory.fieldMap[field];
    const def = this.__factory.definition.get(field);
    if (!def) {
      return;
    }

    if (def.model) {
      if (!value.isVeryModel) {
        value = new this.__factory.getModel(this.__factory.subModel[field]).Instance(value);
      }
    } else if (def.collection) {
      if (!Array.isArray(value)) {
        value = [value];
      }
      value = value.map(function (v) {
        if (!v.isVeryModel) {
          v = new this.__factory.getModel(this.__factory.subModel[field]).Instance(v);
        }
        return v;
      });
    }
    value = this.__process(field, value, processors);
    this.__data[field] = value;
  },

  toJSON: function (opts, depth) {

    opts = opts || {};
    opts.processors = opts.processors || new Set();
    depth = depth || 0;
    opts.depth = opts.depth || 5;
    if (depth > opts.depth) {
      return;
    }
    depth++;

    if (Array.isArray(opts.processors)) {
      opts.processors = new Set(opts.processors);
    }
    opts.processors.add('toJSON');

    const obj = {};
    this.__factory.fields.forEach((field) => {

      const def = this.__factory.definition.get(field);
      if (def.hidden && !opts.showHidden) {
        return;
      }
      let key = field;
      if (opts.useAliases) {
        key = def.alias || field;
      }
      let value = this.__process(field, this.__data[field], opts.processors);
      if (def.collection) {
        value = value.map((v) => {
          return v.toJSON(opts, depth);
        });
      } else if (def.model) {
        value = value.toJSON(opts, depth);
      }
      obj[key] = value;
    });
    return obj;
  },

  toString: function (opts) {
    return JSON.stringify(this.toJSON(opts, depth));
  },

  doValidate: function () {
  }
};

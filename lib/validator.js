var Validator  = require('validator').Validator;
var validators = require('validator').validators;


/*VeryValidator is a wrapper for node-validator, that allows you to re-use
 * validation chains.
 * See https://github.com/chriso/node-validator
 */
function VeryValidator() {
    this.validations = [];
    this.v = new Validator();
    this.errors = [];

    //override Validator errors so exceptions aren't raised
    //and so that we can gather error messages
    this.v.error = function (msg) {
        this.errors.push(msg);
    }.bind(this);
}

(function () {

    //iterate through all of node-validator's validators
    //to create wrapper functions on VeryValidator
    var valfuncs = Object.keys(validators);
    valfuncs.forEach(function (vfunc) {
        this[vfunc] = function () {
            var args = Array.prototype.splice.call(arguments, 0);
            //each wrapper records the function and args
            //for later chaining
            this.validations.push({vfunc: vfunc, args: args});
            return this;
        };
    }.bind(this));

    valfuncs = undefined; // Allow for garbage collection

    //run the recorded validator chain and return the errors
    this.validate = function (value) {
        this.errors = [];
        var c = this.v.check(value);
        for (var vidx in this.validations) {
            var conf = this.validations[vidx];
            if (conf.vfunc) {
                c = this.v[conf.vfunc].apply(this.v, conf.args);
            }
        }
        return this.errors;
    };

    this.isType = function (value, type) {
        return (typeof value === type);
    };

    this.isArray = function (value) {
        return (Array.isArray(value));
    };

    this.custom = function (value, func) {
        return func(value);
    };

}).call(VeryValidator.prototype);



module.exports = VeryValidator;

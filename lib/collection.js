/* VeryCollection: array-like object
 * for managaging lists/collections of models
 * of a single model type
 */
function VeryCollection(modeldef, parent) {
    this.modeldef = modeldef;
    this.parent = parent;

    //we treat local number properties as the items
    this.__defineGetter__('length', function () {
        var keys = Object.keys(this);
        var count = 0;
        keys.forEach(function (key) {
            if (typeof key === 'number' || key.match(/^[0-9]+$/)) {
                count++;
            }
        });
        return count;
    });
}

(function () {

    this.pop = function () {
    };

    this.push = function (value) {
        var model = this.modeldef.create(value);
        model.__parent = this;
        this[Number(this.length)] = model;
        return model;
    };
    
    this.delete = function (idx) {
        delete this[idx];
    };

    this.forEach = function (cb) {
        var keys = Object.keys(this).sort();
        keys.forEach(function (key) {
            if (typeof key === 'number' || key.match(/^[0-9]+$/)) {
                cb(this[key]);
            }
        }.bind(this));
    };

    
}).call(VeryCollection.prototype);


module.exports = VeryCollection;

var veryimport = require('../index');
var VeryModel = veryimport.VeryModel;
var VeryType = veryimport.VeryType;

var generaldef;
var MajorGeneral;
var model;

module.exports = {
    setUp: function (done) {
        generaldef = {
            name: {
                required: true,
                model: {
                    first: {required: false, type: VeryType().isAlpha().len(2, 25)},
                    last: {required: false, type: VeryType().isAlpha().len(3, 25)},
                    title: {depends: {last: true}},
                    full: {derive: function (name) {
                        return (typeof name.title !== 'undefined' ? name.title + ' ' : '') + (typeof name.first !== 'undefined' ? name.first + ' ': '') + name.last;
                        }
                    }
                }
            },
            knowledge: {modelArray: {
                    name: {required: true},
                    category: {required: true, type: VeryType().isIn(['vegetable', 'animal', 'mineral'])}
                }
            },
            rank: {
                required: true,
                type: VeryType().isIn(['Private', 'Corpral', 'Major', 'General', 'Major-General']),
                default: 'Major-General'
            }
        };
        MajorGeneral = new VeryModel(generaldef);
        model = MajorGeneral.create();
        model.__loadData({
            name: {title: 'Major-General', last: 'Stanley'},
            rank: 'Major-General',
            knowledge: [{name: 'animalculous', category: 'animal'}, {name: 'calculus', category: 'mathmatical'}]
        });
        done();
    },
    tearDown: function (done) {
        done();
    },
    'Define a VeryModel': function (test) {
        test.done();
    },
    'Create a Model': function (test) {

        test.done();
    },
    'Load model data': function (test) {
        //done in setup
        test.done();
    },
    'Should failt': function (test) {
        var errors = model.__validate();
        test.ok(errors.length === 1);
        test.done();
    },
    'Edit a VeryModel': function (test) {
        model.rank = 'Private';
        test.ok(model.__toObject().rank === 'Private');
        test.done();
    },
    'Validate passes': function (test) {
        model.knowledge[1].category = 'vegetable';
        test.ok(model.knowledge[1].category == 'vegetable');
        var errors = model.__validate();
        test.ok(errors.length === 0);
        test.done();
    }
};


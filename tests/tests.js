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
            knowledge: {collection: {
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
    'Should fail': function (test) {
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
    },
    'Arrays Validate': function (test) {
        var Args = new VeryModel({atest: {array: [VeryType().isInt(), VeryType().isAlpha()]}});
        var m = Args.create({atest: [1, 'Cheese']});
        test.ok(m.__validate().length === 0);
        test.done();
    },
    'Arrays Fail to Validate': function (test) {
        var Args = new VeryModel({atest: {array: [VeryType().isInt(), VeryType().isAlpha()]}});
        var m = Args.create({atest: [1, 'Cheese1']});
        test.ok(m.__validate().length === 1);
        test.done();
    },
    'Model Arrays': function (test) {
        var List = new VeryModel([
            {required: true, type: VeryType().isInt(), keyword: 'arg1'},
            {keyword: 'arg2', default: 'crap'},
            {type: VeryType().isAlpha(), keyword: 'arg3'},
        ], {array_length:7});
        var list = List.create([1, 'hi']);
        var errors = list.__validate();
        test.ok(errors.length === 0);
        test.ok(Array.isArray(list.__data));
        test.ok(list.__data.length === 3);
        test.ok(list.arg3 === list[2]);
        test.ok(Array.isArray(list.__toObject()));
        test.ok(!Array.isArray(list.__toObject({useKeywords:true})));
        test.done();
    },
    'String Types': function (test) {
        var StringTypeTest = new VeryModel({somed: {type: 'date'}, somee: {type: 'email'}});
        var stt = StringTypeTest.create({somed: '2008-02-10', somee: 'nadsf'});
        var errs = stt.__validate();
        test.ok(errs.length === 1);
        stt.somee = 'nathan@andyet.com';
        errs = stt.__validate();
        test.ok(errs.length === 0);
        test.done();
    },
    'Save': function (test) {
        var Model = new VeryModel({
            test: {required: true}
        });
        Model.setSave(function(model, cb) {
            test.ok(model.test === 'cheese');
            test.done();
        });
        var model = Model.create({test: 'cheese'});
        model.__save();
    },
    'Load': function (test) {
        var Model = new VeryModel({
            test: {required: true}
        });
        Model.setLoad(function (id, cb) {
            cb(false, this.create({test:id}));
        });
        Model.load('35', function (err, model) {
            test.ok(model.test === '35');
            test.done();
        });
    },
    'Private': function (test) {
        var User = new VeryModel({
            username: {},
            password: {private: true},
        });
        var user = User.create({username: 'Bill', password: 'bill is pretty awesome'});
        test.ok(user.password === 'bill is pretty awesome');
        var userobj = user.__toObject();
        test.ok(!userobj.hasOwnProperty('password'));
        userobj = user.__toObject({withPrivate: true});
        test.ok(userobj.hasOwnProperty('password'));
        test.done()
    },
};


var veryimport = require('../index');
var VeryModel = veryimport.VeryModel;
var VeryType = veryimport.VeryValidator;

var fakePassingValidator = {
    validate: function () {
        return true;
    }
};

var fakeFailingValidator = {
    validate: function () {
        return false;
    }
};

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
                    full: {
                        derive: function (name) {
                            return (typeof name.title !== 'undefined' ? name.title + ' ' : '') + (typeof name.first !== 'undefined' ? name.first + ' ': '') + name.last;
                        }
                    }
                }
            },
            knowledge: {
                collection: {
                    name: {required: true},
                    category: {required: true, type: VeryType().isIn(['vegetable', 'animal', 'mineral'])}
                }
            },
            rank: {
                required: true,
                type: VeryType().isIn(['Private', 'Corpral', 'Major', 'General', 'Major-General']),
                default: 'Major-General'
            },
            birthday: {
                required: false,
                type: VeryType().isDate(),
                processIn: function (value) {
                    return new Date(value);
                },
                processOut: function (value) {
                    return value.toISOString();
                }
            }
        };
        MajorGeneral = new VeryModel(generaldef);
        model = MajorGeneral.create({
            name: {title: 'Major-General', last: 'Stanley'},
            rank: 'Major-General',
            knowledge: [{name: 'animalculous', category: 'animal'}, {name: 'calculus', category: 'mathmatical'}],
            birthday: '1965-12-02T00:00:00.000Z'
        });
        done();
    },
    tearDown: function (done) {
        done();
    },
    'Define a VeryModel': function (test) {
        var TestModel = new VeryModel({atest: VeryType().isInt()});
        test.ok(TestModel instanceof VeryModel);
        test.done();
    },
    'Create a Model': function (test) {
        var TestModel = new VeryModel({atest: VeryType().isInt()});
        var m = TestModel.create();
        test.ok(m.hasOwnProperty('__verymeta')); // ugly but __verymeta is a property verymodel adds to objects
        test.done();
    },
    'Boolean passing validators work': function (test) {
        var TestModel = new VeryModel({ passTest: { type: fakePassingValidator } });
        var m = TestModel.create({ passTest: 1 });
        var errors = m.doValidate();
        test.ok(errors.length === 0);
        test.done();
    },
    'Boolean failing validators work': function (test) {
        var TestModel = new VeryModel({ failTest: { type: fakeFailingValidator } });
        var m = TestModel.create({ failTest: 1 });
        var errors = m.doValidate();
        test.ok(errors.length === 1);
        test.done();
    },
    'Load model data': function (test) {
        var TestModel = new VeryModel({atest: VeryType().isInt()});
        var m = TestModel.create({atest: 4});
        test.ok(m.toJSON().atest === 4);
        test.done();
    },
    'Should fail': function (test) {
        var errors = model.doValidate();
        test.ok(errors.length === 1);
        test.done();
    },
    'Edit a VeryModel': function (test) {
        model.rank = 'Private';
        test.ok(model.toJSON().rank === 'Private');
        test.done();
    },
    'Validate passes': function (test) {
        model.knowledge[1].category = 'vegetable';
        test.ok(model.knowledge[1].category == 'vegetable');
        var errors = model.doValidate();
        test.ok(errors.length === 0);
        test.done();
    },
    'ProcessIn and processOut': function (test) {
        test.ok(model.__verymeta.data.birthday instanceof Date);
        test.ok(model.birthday instanceof Date);
        test.ok(typeof model.toJSON().birthday === 'string');
        test.done();
    },
    'Derived fields are populated': function (test) {
        test.ok(model.toJSON().name.full == 'Major-General Stanley');
        test.done();
    },
    'Arrays Validate': function (test) {
        var Args = new VeryModel({atest: {array: [VeryType().isInt(), VeryType().isAlpha()]}});
        var m = Args.create({atest: [1, 'Cheese']});
        test.ok(m.doValidate().length === 0);
        test.done();
    },
    'Arrays Fail to Validate': function (test) {
        var Args = new VeryModel({atest: {array: [VeryType().isInt(), VeryType().isAlpha()]}});
        var m = Args.create({atest: [1, 'Cheese1']});
        test.ok(m.doValidate().length === 1);
        test.done();
    },
    'Model Arrays': function (test) {
        var List = new VeryModel([
            {required: true, type: VeryType().isInt(), keyword: 'arg1'},
            {keyword: 'arg2', default: 'crap'},
            {type: VeryType().isAlpha(), keyword: 'arg3'},
        ], {array_length: 7});
        var list = List.create([1, 'hi']);
        var errors = list.doValidate();
        test.ok(errors.length === 0);
        test.ok(Array.isArray(list.__verymeta.data));
        test.ok(list.__verymeta.data.length === 3);
        test.ok(list.arg3 === list[2]);
        test.ok(Array.isArray(list.toJSON()));
        test.ok(!Array.isArray(list.toJSON({useKeywords: true})));
        test.done();
    },
    'String Types': function (test) {
        var StringTypeTest = new VeryModel({somed: {type: 'date'}, somee: {type: 'email'}});
        var stt = StringTypeTest.create({somed: '2008-02-10', somee: 'nadsf'});
        var errs = stt.doValidate();
        test.ok(errs.length === 1);
        stt.somee = 'nathan@andyet.com';
        errs = stt.doValidate();
        test.ok(errs.length === 0);
        test.done();
    },
    'Private': function (test) {
        var User = new VeryModel({
            username: {},
            password: {private: true},
        });
        var user = User.create({username: 'Bill', password: 'bill is pretty awesome'});
        test.ok(user.password === 'bill is pretty awesome');
        var userobj = user.toJSON();
        test.ok(!userobj.hasOwnProperty('password'));
        userobj = user.toJSON({withPrivate: true});
        test.ok(userobj.hasOwnProperty('password'));
        test.done();
    },
    'Validate Arguments': function (test) {
        var doItArgs = new VeryModel([
            {required: true, keyword: 'msg'},
            {required: false, keyword: 'save', default: false},
            {required: true, keyword: 'cb'}
        ]);

        function doIt() {
            var args = doItArgs.create(arguments);
            var errors = args.doValidate();
            args.cb(errors, args.msg, args.save);
        }

        doIt('hi there', function (err, msg, save) {
            test.ok(msg === 'hi there', "msg matches");
            test.ok(save === false, "save is false");
            test.ok(err.length === 0), "no errors";
            test.done();
        });
    },
    'Static Fields': function (test) {
        var Thing = new VeryModel({thinger: {static: true}});
        var thing = Thing.create({thinger: 'hi'});
        test.ok(thing.thinger === 'hi');
        test.throws(function () {
            thing.thinger = 'crap';
        });
        test.done();
    },
    'Inheritance': function (test) {
        var Parent = new VeryModel({foo: {type: 'date'}, bar: {type: 'string'}});
        var Child = new VeryModel({bar: {type: 'number'}});
        Child.inherit(Parent);

        var obj = Child.create({foo: '2008-02-10', bar: 123});
        test.ok(obj.bar === 123);
        test.ok(obj.foo === '2008-02-10');
        var errs = obj.doValidate();
        test.ok(errs.length === 0);
        test.done();
    },

    'Sub-models do not transform data when set directly' : function (test) {
        var ThingDef = {
            sub: {
                model: new VeryModel({
                    created: {
                        type: VeryType().isDate(),
                        processIn: function (val) { return new Date(val); },
                        processOut: function (val) { return (val && val.toISOString) ? val.toISOString() : val; }
                    }
                })
            }
        };
        var Thing = new VeryModel(ThingDef);

        var sub = {created: '2007-01-01T12:00:00'};
        var thing = Thing.create({sub: sub});
        test.ok(thing.sub.created instanceof Date);

        thing.sub = sub;
        test.ok(!(thing.sub.created instanceof Date));
        test.ok(thing.sub.created === sub.created);
        test.done();
    },

    'All keys should be processed even if there are unexpected keys': function (test) {
        var Thing = new VeryModel({
            a: {processIn: function (a) { return a + '!'; }},
            b: {processIn: function (a) { return a + '!'; }},
            c: {processIn: function (a) { return a + '!'; }},
        });
        var thing = Thing.create({'crap': 'hi', 'a': 'no', 'b': 'why', 'c': 'hah', 'e': 'hklj'});
        test.ok(thing.a === 'no!');
        test.ok(thing.b === 'why!');
        test.ok(thing.c === 'hah!');
        test.done();
    },

    'onSet': function (test) {
        var Thing = new VeryModel({
            a: { onSet: function (a) {
                    return 'bye';
                }
            }
        });
        var thing = Thing.create({a: 'hi'});
        test.equals(thing.a, 'hi');
        thing.a = 'weeee';
        test.equals(thing.a, 'bye');
        test.done();
    },

    'isSet': function (test) {
        var Thing = new VeryModel({
            a: { 
                derive: function (a) {
                    if (!this.isSet('a')) {
                        return 'ham';
                    } else {
                        return 'cheese';
                    }
                }
            }
        });
        var thing = Thing.create({});
        test.equals(thing.a, 'ham');
        thing.a = 'what';
        test.equals(thing.a, 'cheese');
        test.done();
    },
    "Enum type": function (test) {
        var Thing = new VeryModel({
            field: {type: 'enum', values: ['yes', 'no', 'maybe']},
        });
        var t = Thing.create({field: 'yes'});
        test.equals(t.doValidate().length, 0);
        t.field = 'ham';
        test.equals(t.doValidate().length, 1);
        test.done();
    },
    "Integer type": function (test) {
        var Thing = new VeryModel({
            field: {type: 'integer'},
        });
        var t = Thing.create({field: '23'});
        test.equals(t.doValidate().length, 0);
        t.field = 'ham';
        test.equals(t.doValidate().length, 1);
        test.done();
    },
    "Appending to a list": function (test) {
        var Thing = new VeryModel({
            field: {type: 'array'},
        });
        var x = Thing.create();
        x.field.push('a');
        var y = Thing.create();
        test.equals(x.field.length, 1);
        test.equals(y.field.length, 0);
        test.done();
    },
};


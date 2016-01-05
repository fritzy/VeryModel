var veryimport = require('../index');
var VeryModel = veryimport.VeryModel;
var joi = require('joi');

var generaldef;
var MajorGeneral;
var model;

module.exports = {
    setUp: function (done) {
        generaldef = {
            name: {
                model: {
                    first: {validate: joi.string().alphanum().min(2).max(25)},
                    last: {validate: joi.string().alphanum().min(3).max(25)},
                    title: {depends: ['last'], validate: joi.string()},
                    full: {
                        derive: function (name) {
                            return (typeof name.title !== 'undefined' ? name.title + ' ' : '') + (typeof name.first !== 'undefined' ? name.first + ' ': '') + name.last;
                        },
                        validate: joi.string()
                    }
                }
            },
            knowledge: {
                collection: {
                    name: {validate: joi.string().required()},
                    category: {validate: joi.any().valid(['vegetable', 'animal', 'mineral']).required()}
                }
            },
            rank: {
                validate: joi.any().valid(['Private', 'Corpral', 'Major', 'General', 'Major-General']).required(),
                default: 'Major-General'
            },
            birthday: {
                validate: joi.date(),
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
        var TestModel = new VeryModel({atest: {validate: joi.number().integer()}});
        test.ok(TestModel instanceof VeryModel);
        test.done();
    },
    'Create a Model': function (test) {
        var TestModel = new VeryModel({atest: {validate: joi.number().integer()}});
        var m = TestModel.create();
        test.ok(m.hasOwnProperty('__verymeta')); // ugly but __verymeta is a property verymodel adds to objects
        test.done();
    },
    'Boolean passing validators work': function (test) {
        var TestModel = new VeryModel({ passTest: { validate: joi.number() } });
        var m = TestModel.create({ passTest: 1 });
        var errors = m.doValidate();
        test.ok(errors.error === null);
        test.done();
    },
    'Boolean failing validators work': function (test) {
        var TestModel = new VeryModel({ failTest: { validate: joi.number() } });
        var m = TestModel.create({ failTest: 'hey' });
        var errors = m.doValidate();
        test.ok(errors.error.name === 'ValidationError');
        test.done();
    },
    'Load model data': function (test) {
        var TestModel = new VeryModel({atest: {validate: joi.number().integer()}});
        var m = TestModel.create({atest: 4});
        test.ok(m.toJSON().atest === 4);
        test.done();
    },
    'Should fail': function (test) {
        var errors = model.doValidate();
        test.ok(errors.error.name === 'ValidationError');
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
        test.ok(errors.error === null);
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
        var Args = new VeryModel({atest: {validate: joi.array().items(joi.number().integer(), joi.string().alphanum())}});
        var m = Args.create({atest: [1, 'Cheese']});
        var error = m.doValidate();
        test.ok(error.error === null);
        test.done();
    },
    'Arrays Fail to Validate': function (test) {
        var Args = new VeryModel({atest: {validate: joi.array().items(joi.string().alphanum())}});
        var m = Args.create({atest: [1, 'Cheese1']});
        test.ok(m.doValidate().error.name === 'ValidationError');
        test.done();
    },
    'Model Arrays': function (test) {
        var List = new VeryModel([
            {validate: joi.number().integer(), alias: 'arg1'},
            {alias: 'arg2', validate: joi.string(), default: 'crap'},
            {validate: joi.string().alphanum(), alias: 'arg3'},
        ], {array_length: 7});
        var list = List.create([1, 'crap', 'hi']);
        var errors = list.doValidate();
        test.ok(errors.error === null);
        test.ok(Array.isArray(list.__verymeta.data));
        test.ok(list.__verymeta.data.length === 3);
        test.ok(list.arg3 === list[2]);
        test.ok(Array.isArray(list.toJSON()));
        test.ok(!Array.isArray(list.toJSON({useAliases: true})));
        test.done();
    },
    'String Types': function (test) {
        var StringTypeTest = new VeryModel({somed: {type: 'date'}, somee: {type: 'email'}});
        var stt = StringTypeTest.create({somed: '2008-02-10', somee: 'nadsf'});
        var errs = stt.doValidate();
        test.ok(errs.error.details.length === 1);
        stt.somee = 'nathan@andyet.com';
        errs = stt.doValidate();
        test.ok(errs.error === null);
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
        test.ok(errs.error === null);
        test.done();
    },
    'joi exporting': function (test) {
        var Thing = new VeryModel({
            a: {validate: joi.number().integer()},
            b: {validate: joi.string().alphanum()},
            c: {validate: joi.string().guid()}
        });
        var val = Thing.exportJoi();
        var error = val.validate({
            a: 13,
            b: 'laksjdf34',
            c: '0e4c27ce-023c-490b-a3b9-1d0afed7125a'
        });
        test.ok(error.error === null);
        var val2 = Thing.exportJoi(['a', 'c'], false);
        error = val2.validate({
            a: 234,
            c: '0e4c27ce-023c-490b-a3b9-1d0afed7125a'
        });
        test.ok(error.error === null);
        error = val2.validate({
            a: 234,
            b: 'lkjasdf23',
            c: '0e4c27ce-023c-490b-a3b9-1d0afed7125a'
        });
        test.ok(error.error !== null);
        test.done();
    },
    'joi exporting with submodels': function (test) {
        var Thing = new VeryModel({
            a: {validate: joi.number().integer()},
            b: {validate: joi.string().alphanum()},
            c: {validate: joi.string().guid()}
        });
        var Thing2 = new VeryModel({
            a: {validate: joi.string()},
            b: {model: Thing}
        });
        var val = Thing2.exportJoi({root: ['a', 'b'], b: ['a', 'b']});
        var error = val.validate({'a': 'herp derp', 'b': {'a': 34, b: 'adf314'}});
        test.ok(error.error === null);
        test.done();
    },
    'Sub-models do not transform data when set directly' : function (test) {
        var ThingDef = {
            sub: {
                model: new VeryModel({
                    created: {
                        validate: joi.date(),
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
    "UseAlias option": function (test) {
        var Thing = new VeryModel({field: {alias: 'ham'}}, {toJSONUseAliases: true});
        var thing1 = Thing.create({field: 'cheese'});
        test.equals(thing1.ham, 'cheese');
        thing1.ham = 'derp';
        var thingjson = thing1.toJSON();
        test.equals(thingjson.ham, 'derp');
        test.equals(thing1.ham, 'derp');
        test.equals(thing1.field, 'derp');
        test.equals(thingjson.hasOwnProperty('field'), false);
        var t2 = Thing.create({ham: 'crap'});
        test.equals(t2.field, 'crap');

        test.done();
    },
    "Set a deferred model": function (test) {
        var Thing2 = new VeryModel({things: {model: 'Thing1'}, thingy: {}}, {});
        var Thing1 = new VeryModel({name: {}}, { name: 'Thing1', cache: true});
        var t1 = Thing1.create({name: 'Hi'});
        var t2 = Thing2.create({thingy: 'why'});
        t2.things = t1;
        var t2j = t2.toJSON();
        test.equals(t2.things.name, 'Hi');
        test.equals(t2j.things.name, 'Hi');
        test.done();
    },
    "Set a deferred collection": function (test) {
        var Thing2 = new VeryModel({things: {collection: 'Thing1'}, thingy: {}}, {});
        var Thing1 = new VeryModel({name: {}}, { name: 'Thing1', cache: true});
        var t1 = Thing1.create({name: 'Hi'});
        var t2 = Thing2.create({thingy: 'why'});
        t2.things.push(t1);
        var t2j = t2.toJSON();
        test.equals(t2.things[0].name, 'Hi');
        test.equals(t2j.things[0].name, 'Hi');
        test.done();
    },
    "Assign a collection": function (test) {
        var Thing2 = new VeryModel({things: {collection: 'Thing1'}, thingy: {}}, {});
        var Thing1 = new VeryModel({name: {}}, { name: 'Thing1', cache: true});
        var t1 = Thing1.create({name: 'Hi'});
        var t2 = Thing2.create({thingy: 'why'});
        t2.things = [t1];
        var t2j = t2.toJSON();
        test.equals(t2.things[0].name, 'Hi');
        test.equals(t2j.things[0].name, 'Hi');
        test.done();
    },
    "Recursively assign a collection": function (test) {
        var Thing2 = new VeryModel({id: {}, things: {collection: 'Thing1'}, thingy: {}}, {});
        var Thing1 = new VeryModel({name: {}}, { name: 'Thing1', cache: true});
        var t2 = Thing2.create({id: 1, things: [{name: 'Billy Bob'}, {name: 'Ham Sammich'}]});
        test.equals(t2.things[0].name, 'Billy Bob');
        test.equals(t2.things[1].name, 'Ham Sammich');
        var t2j = t2.toJSON();
        test.equals(t2j.things[0].name, 'Billy Bob');
        test.equals(t2j.things[1].name, 'Ham Sammich');
        test.done();
    },
    "process flags": function (test) {
        var Thing1 = new VeryModel({
            name: {
                processors: {
                    testIn: function (value) {
                        return value + '?';
                    },
                }
            }
        });
        var t1 = Thing1.create({name: 'Fritzy'}, {processors: ['testIn']});
        test.equals(t1.name, 'Fritzy?');
        var t1j = t1.toJSON();
        test.equals(t1j.name, 'Fritzy?');
        var t2j = t1.toJSON({processors: ['testIn']});
        test.equals(t2j.name, 'Fritzy??');
        test.done();
    },
    "process flags of array": function (test) {
        var Thing2 = new VeryModel({
            name: {
                processors: {
                    testIn2: function (value) {
                        return value.join(' ');
                    },
                }
            }
        });
        var t1 = Thing2.create({name: ['Nathan', 'Fritz']}, {processors: ['testIn2']});
        test.equals(t1.name, 'Nathan Fritz');
        test.done();
    },
    "show empty": function (test) {
        var Fruit = new VeryModel({
            name: {}
        });
        var Vegitable = new VeryModel({
            name: {}
        });
        var Basket = new VeryModel({
            fruit: {model: Fruit, showEmpty: true},
            vegitables: {collection: Vegitable, showEmpty: true},
            size: {}
        });
        var basket = Basket.create({size: 'small'});
        var jb = basket.toJSON();
        test.equals(typeof jb.fruit, 'object');
        test.equals(Array.isArray(jb.fruit), false);
        test.equals(Array.isArray(jb.vegitables), true);
        console.log(jb);
        test.done();
    }
};

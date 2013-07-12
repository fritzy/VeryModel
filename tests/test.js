var veryimport = require('../index');
var VeryModel = veryimport.VeryModel;
var VeryType = veryimport.VeryType;

console.log(veryimport);

x = VeryType();
x.isInt().notNull();

console.log(x.validate("hi"));
console.log(x.validate("bye"));

var AccessPolicy = new VeryModel({
    id: {required: true, type: VeryType().isAlphanumeric(), default: "1"},
    Created: {default: 0},
    LastModified: {required: true, default: 0},
    Name: {required: true, default: "Billy Bob"},
    DurationInMinutes: {default: 0},
    Permissions: {default: 1}
});

x = AccessPolicy.create();

var y = x.__toObject();
console.log(y);
console.log(x.__toJSON());

var TestModel = new VeryModel({
    name: {required: true, model: {
            first: {required: true, default: "Nathan"},
            last: {required: true, default: "Fritz"},
            full: {derive: function (model) {
                    return model.__parent.name.first + ' ' + model.last;
                }
            }
        }
    },
    age: {required: true, default: 13},
    things: {modelArray: {
            name: {required: true, default: "Pet", type: VeryType().isAlpha()},
        }
    },
    other: {required: false, type: VeryType().len(20, 100)},
})
var tm = TestModel.create()
tm.things.push({name: "Train"});
tm.things[0].name = 'Crap';
tm.other = 'Whaat';
var tmo = tm.__toObject();
console.log(tm.__validate());
 
var test2 = new VeryModel({
    parent: {required: true, model: TestModel}
});

var t2  = test2.create();
t2.parent.things.push({name: "Cat1"});
console.log(t2.__toObject());
console.log(t2.__validate());
console.log(t2.parent.things[0].name);


console.log('-----------------------');
var generaldef = {
    name: {
        required: true,
        model: {
            first: {required: false, type: VeryType().isAlpha().len(2, 25)},
            last: {required: false, type: VeryType().isAlpha().len(3, 25)},
            title: {depends: {last: VeryType().isAlpha().len(3, 25)}},
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


var MajorGeneral = new VeryModel(generaldef);
var stanley = MajorGeneral.create({
name: {title: 'Major-General', last: 'Stanley'},
rank: 'Major-General',
knowledge: [{name: 'animalculous', category: 'animal'}, {name: 'calculus', category: 'mathmatical'}]
});
var errors = stanley.__validate();
console.log(errors);
console.log(stanley.__toObject());


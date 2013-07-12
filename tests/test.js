var veryimport = require('../index');
var VeryModel = veryimport.VeryModel;
var VeryType = veryimport.VeryType;

console.log(veryimport);

x = VeryType();
x.isInt().notNull();

result = x.validate(1);

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
            last: {required: true, default: "Fritz"}
        }
    },
    age: {required: true, default: 13},
    things: {modelArray: {
            name: {required: true, default: "Pet"},
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
    other: {required: true, model: TestModel}
});

console.log(test2.create().__toObject());

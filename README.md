VeryModel
=========

A JavaScript model system for validation, creation, and editing of models.

I wrote this because the robust model systems that I found were tightly integrated with frameworks, or only served to be useful for validation.  
VeryModel is not tied to a framework, and it implements a full purpose Model system.

## OK, But What Is It?

Models are useful for managing the lifecycle of an object.
They are commonly used for framework ORMs (Object Relational Managers) and the M in MVC (Model-View-Controller) patterns like Backbone.js.

Models can also be extended with functionality for interacting with databases and network/HTTP APIs, making them little SDKs
specific to each type of data you deal with.

## Quick Example


## Definitions, Model Factory, Model Instances

verymodel.VeryModel is a constructor (must be called with new) that takes a definition (object of fields and parameters).  

    var verymodel = require('verymodel');
    
    // setup your factory
    var SomeModelFactory = new verymodel.VeryModel({
        //definition here
        some_field: {
            // field parameters (see Definition Spec below)
        },
        some_other_field: {
            // field parameters (see Definition Spec blow)
        },
    }); 
    
    // create an instance of a model
    var model_instance = SomeModelFactory.create({
        //initial model data here
    }); 

The resulting object is a [factory](http://en.wikipedia.org/wiki/Factory_%28software_concept%29) that produces model instances based on the defintion with the `.create(values)` method.

Model instances are working instances of your object data. They use property setters/getters to interface with your data, and are **not** simple JSON style objects.

## Adding functionality

Both Model Factories and Model Instances can be extended to add parameters and functions, typically used for database interactions like `load` and `save()` or HTTP REST calls like `list()`, `get()`, `post()`, `put()`, `delete()`.

Functions that load data should be added onto the Factory like load, list, getByName, etc.

    //these functions can be named anything, do anything, and have any parameters.
    //extending the factory with new functions is useful for dealing with the model BEFORE it contains any data (like loading/getting)
    SomeModelFactory.load = function (id, callback) { //most IO in Node.js is async, so here's an callback example
        db.get(id, function (err, result) {
            callback(err, this.create(result));
        });
    }

    SomeModelFactory.list = function (offset, count, callback) {
        db.select("SELECT * FROM SomeTable LIMIT %d %d", offset, count, function (err, results) {
            var model_instances = [];
            if (!err) {
                results.
            }
        });
    }

Functions that you want to use on Model Instances like save, delete is extended with `extendModel`.

    SomeModelFactory.extendModel({
        save: function (callback) {
            db.set(this.key, this.toJSON(), callback);
        },
        delete: function (callback) {
            db.del(this.key, callback);
        }
    });


## Definition Spec

Model defintions are recursive Javascript object. At each layer, you can have the following fields:

* `required` (boolean): Error on validation if this field isn't set.
* `type` (VeryType): VeryType chain to validate field against if set.
* `default` (any): Default value set automatically. If you use a mutable object, use a function that returns a new instance instead.
* `model` (definition object or VeryModel): set this field as another model.
* `collection` (definition object or VeryModel): set this field as a collection of a model.
* `derive` `function`): Derive the value of this field with this function whenever field is accessed
    `{derive: function(model) {return model.first + ' ' + model.last}`
* `depends` ({some_other_field: VeryType or true}, ...): Require other fields when this field is set, optionally run VeryType chain check on other field.
* `private` (boolean): `toObject()` will not include this field in expect unless the argument withPrivate is true
* `processIn` (function): value will be transformed on set via the `processIn` function
* `processOut` (function): value will be transformed on set via the `processOut` function when `toObject()` is called
* `onSet` (function): similar to processIn, but not run during the create() process, only when a value is directly assigned.

**Node: context (`this`) on all function calls are the model instance, in order to give you access within your functions**

## VeryType

VeryType is a wrapper on [node-validator](https://raw2.github.com/chriso/node-validator/),
the only change being that we can define a validation seperately from using it.

    var verymodel = require('verymodel')
    var SomeFactory = new verymodel.VeryModel({
        some_field: {
            type: new VeryType().isEmail().isLength(5, 40),
            required: true,
            default: 'example@example.com'
        }
    });

Here are all of the node-validator functions (lifted from their README).

**NOTE: the first str value must be omitted when used with the VeryType wrapper**

- **equals(str, comparison)** - check if the string matches the comparison.
- **contains(str, seed)** - check if the string contains the seed.
- **matches(str, pattern [, modifiers])** - check if string matches the pattern. Either `matches('foo', /foo/i)` or `matches('foo', 'foo', 'i')`.
- **isEmail(str)** - check if the string is an email.
- **isURL(str)** - check if the string is an URL.
- **isIP(str [, version])** - check if the string is an IP (version 4 or 6).
- **isAlpha(str)** - check if the string contains only letters (a-zA-Z).
- **isNumeric(str)** - check if the string contains only numbers.
- **isAlphanumeric(str)** - check if the string contains only letters and numbers.
- **isHexadecimal(str)** - check if the string is a hexadecimal number.
- **isHexColor(str)** - check if the string is a hexadecimal color.
- **isLowercase(str)** - check if the string is lowercase.
- **isUppercase(str)** - check if the string is uppercase.
- **isInt(str)** - check if the string is an integer.
- **isFloat(str)** - check if the string is a float.
- **isDivisibleBy(str, number)** - check if the string is a number that's divisible by another.
- **isNull(str)** - check if the string is null.
- **isLength(str, min [, max])** - check if the string's length falls in a range.
- **isUUID(str [, version])** - check if the string is a UUID (version 3, 4 or 5).
- **isDate(str)** - check if the string is a date.
- **isAfter(str [, date])** - check if the string is a date that's after the specified date (defaults to now).
- **isBefore(str [, date])** - check if the string is a date that's before the specified date.
- **isIn(str, values)** - check if the string is in a array of allowed values.
- **isCreditCard(str)** - check if the string is a credit card.
- **isISBN(str [, version])** - check if the string is an ISBN (version 10 or 13).

### Using Model Instances

Models can be treated like normal objects. Each field has a getter/setter.

    somemodelinstance.defined_field = 'hello';

Models also refer to their `__parent`


`loadData(data)`

Rather than setting fields individually, set them en masse with an object.

`toJSON()`

Export an object with no getters, setters, state, etc... just the object with derived fields.

`doValidate()`

returns an array of error strings.

`getOldModel()`

Returns a new model instance as Factory.create(this.toJSON()) using the data from the original create call.

`getChanges()`

Returns an object of changed fields from create with 'then' and 'now' values.
    
    {
        field1: {then: 'cheese', now: 'ham'},
        field2: {then: 'whoever', now: 'whomever'}
    }

`diff(othermodelinstance)`

Returns an object of different fields with 'left' and 'right' values.
    
    {
        field1: {left: 'cheese', right: 'ham'},
        field2: {left: 'whoever', right: 'whomever'}
    }

`isSet(field)`

Returns boolean if the field is not undefined. Useful in processIn and derived functions to prevent recursion.


## \_\_verymeta

Model instances have access to a variable, `this.__verymeta.model`, which is the Model Factory used to make this Model Instance.

### Validate and Name Function Arguments

Model definitions can be objects or arrays.  
Using an array definition, we can use VeryModel help manage function arguments (mapping, optional arguments, and validation).
    
```javascript
doItArgs = new VeryModel([
    {required: true, keyword: 'msg'},
    {required: true, type: VeryType().isIn('small', 'big', 'huge'), default: 'small'},
    {required: false, keyword: 'save', default: false, type: 'boolean'},
    {required: true, keyword: 'cb', type: 'function'}
]);

function doIt() {
    var args = doItArgs.create(arguments);
    var errors = args.doValidate();
    args.cb(errors, args.type, args.msg, args.save);
}

doIt('hi there', function(err, type, msg, save) {
    console.log("Made it!");
});
```

## Install

`npm install verymodel`

#### Extended Example Definition

    var generaldef = {
        name: {
            required: true,
            model: {
                first: {required: false, type: VeryType().isAlpha().len(2, 25)},
                last: {required: false, type: VeryType().isAlpha().len(3, 25)},
                title: {depends: {last: true},
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


### Extended Example Usage

This class interprets defintions and spawns models from `create`.

Initialize with a definition.

    var MajorGeneral = new VeryModel(generaldef);
    var stanley = MajorGeneral.create({
        name: {title: 'Major-General', last: 'Stanley'},
        rank: 'Major-General',
        knowledge: [{name: 'animalculous', category: 'animal'}, {name: 'calculus', category: 'mathmatical'}]
    });
    var errors = stanley.doValidate();
    console.log(errors);

Output:

    [ 'knowledge[1].category: Unexpected value or invalid argument' ]

Turns out he knows more than just animals, vegetables, minerals.

    stanley.knowledge[1].category = 'vegetable';

That ought to do it.
    
    var errors = stanley.doValidate();
    console.log(errors);

Output:

    []

Let's see what our object looks like:

    console.log(stanley.toObject());

Output:

    { name:
       { last: 'Stanley',
         title: 'Major-General',
         full: 'Major-General Stanley' },
      knowledge:
       [ { name: 'animalculous', category: 'animal' },
         { name: 'calculus', category: 'vegetable' } ],
      rank: 'Major-General' }

Noticed that the derived field, `name.full` was populated.

![the VeryModel of a modern major general](https://cldup.com/uYqBNVl8ku.png)

![npm i verymodel](https://www.npmjs.com/package/verymodel)

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

verymodel.Model is a constructor (must be called with new) that takes a definition (object of fields and parameters).  

```javascript
var verymodel = require('verymodel');

// setup your factory
var SomeModelFactory = new verymodel.Model({
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
```

The resulting object is a [factory](http://en.wikipedia.org/wiki/Factory_%28software_concept%29) that produces model instances based on the defintion with the `.create(values)` method.

Model instances are working instances of your object data. They use property setters/getters to interface with your data, and are **not** simple JSON style objects.

## Compatibility Changes with v2

The main difference between v3 and v2 is that the definition validator must now be a Joi validator.

As such, "required" is no longer a necessary field, depends is now an array, and several undocumented features were removed.

## Index

* [Adding Functionality](#add-func)
* [Extended Example](#ext-examp)
* [Field Definitions](#field-def)
    * [type](#def-type)
    * [model](#def-model)
    * [collection](#def-collection)
    * [validate](#def-validate)
    * [processIn](#def-processIn)
    * [processOut](#def-processOut)
    * [processors](#def-processors)
    * [onSet](#def-onSet)
    * [derive](#def-derive)
    * [index](#def-index)
    * [default](#def-default)
    * [derive](#def-derive)
    * [depends](#def-depends)
    * [private](#def-private)
* [Model Options](#model-options)
    * [name](#mo-name)
* [Model Factory Methods](#model-factory-methods)
    * [create](#create)
    * [exportJoi](#exportJoi)
* [Model Instance Methods](#model-instance-methods)
    * [toJSON](#toJSON)
    * [toString](#toString)
    * [diff](#diff)
    * [getChanges](#getChanges)
    * [getOldModel](#getOldModel)
    * [loadData](#loadData)


<a name='add-func'></a>
## Adding functionality

Both Model Factories and Model Instances can be extended to add parameters and functions, typically used for database interactions like `load` and `save()` or HTTP REST calls like `list()`, `get()`, `post()`, `put()`, `delete()`.

Functions that load data should be added onto the Factory like load, list, getByName, etc.

```javascript
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
```

Functions that you want to use on Model Instances like save, delete is extended with `extendModel`.

```javascript
SomeModelFactory.extendModel({
    save: function (callback) {
        db.set(this.key, this.toJSON(), callback);
    },
    delete: function (callback) {
        db.del(this.key, callback);
    }
});
```

<a name='ext-examp'></a>
## Extended Example

```javascript
var generaldef = {
    name: {
        model: {
            first: {validator: joi.string().alphanum().min(2).max(25)},
            last: {validator: joi.string().alphanum().min(3).max(25)},
            title: {depends: ['last'],
            full: {derive: function (name) {
                return (typeof name.title !== 'undefined' ? name.title + ' ' : '') + (typeof name.first !== 'undefined' ? name.first + ' ': '') + name.last;
                }
            }
        }
    },
    knowledge: {collection: {
            name: {},
            category: {validate: joi.any().valid(['vegetable', 'animal', 'mineral'])}
        }
    },
    rank: {
        validate: joi.any().valid(['Private', 'Corpral', 'Major', 'General', 'Major-General']),
        default: 'Major-General'
    }
};
```

This class interprets defintions and spawns models from `create`.

Initialize with a definition.

```javascript
var MajorGeneral = new verymodel.Model(generaldef);
var stanley = MajorGeneral.create({
    name: {title: 'Major-General', last: 'Stanley'},
    rank: 'Major-General',
    knowledge: [{name: 'animalculous', category: 'animal'}, {name: 'calculus', category: 'mathmatical'}]
});
var errors = stanley.doValidate();
console.log(errors);
```
Output:

```javascript
[ 'knowledge[1].category: Unexpected value or invalid argument' ]
```

Turns out he knows more than just animals, vegetables, minerals.

```javascript
stanley.knowledge[1].category = 'vegetable';
```

That ought to do it.
    
```javascript
var errors = stanley.doValidate();
console.log(errors);
```

Output:

```javascript
[]
```

Let's see what our object looks like:

```javascript
console.log(stanley.toJSON());
```

Output:

```javascript
{ name:
   { last: 'Stanley',
     title: 'Major-General',
     full: 'Major-General Stanley' },
  knowledge:
   [ { name: 'animalculous', category: 'animal' },
     { name: 'calculus', category: 'vegetable' } ],
  rank: 'Major-General' }
```

Noticed that the derived field, `name.full` was populated.

<a name='field-def'></a>

##Field Definitions

* [type](#def-type)
* [model](#def-model)
* [collection](#def-collection)
* [validate](#def-validate)
* [processIn](#def-processIn)
* [processOut](#def-processOut)
* [processors](#def-processors)
* [onSet](#def-onSet)
* [derive](#def-derive)
* [index](#def-index)
* [default](#def-default)
* [derive](#def-derive)
* [depends](#def-depends)
* [private](#def-private)

<a name='def-type'></a>
__type__

A string which references a built in type.
Built in types include `string`, `array`, `integer`, `numeric`, `enum`, `boolean`.
Strings and arrays may have `min` and `max` values, both for validation, and max will truncate the results when saving or on `toJSON`.
Enums may include `values`, an array (and eventually a ECMAScript 6 set).

You can override any of the definition fields of a specified type. Validate, processIn, processOut, and onSet will use both the built-in and your override. The others will replace the definition field.

`type` does not need to be set at all. In fact, `{}` is a perfectly valid definition.

Example:

```javascript
{field: {type: 'string', max: 140}}
```
----

<a name='def-model'></a>
__model__

The model parameter defines a submodel. It can be an object of field definitions, a `VeryModel` Factory Instance, or the string matching the name of a VeryModel factory described in it's options.

<a name='def-collection'></a>
__collection__

Like sub [models](#def-model), collections may be a string name of a model, model factory, or model definition object in order to define an array of models.

<a name='def-validate'></a>
__validate__

The `validate` field takes a Joi validator and should determine whether that value is acceptable or not. It's run during `doValidate()`.

Example:

```js
new verymodel.Model({field: { validate: Joi.string().max(2) }});
```

----

<a name='def-processIn'></a>
__processIn__

`processIn` is a function that is passed a value on loading from the database, `create`, or `loadData`. It should return a value.

This function is often paired with `processOut` in order to make an interactive object when in model form, and a serialized form when converted.

`processIn` does not handle the case of direct assignment like `modelinst.field = 'cheese';`. Use `onSet` for this case.

Example:

```javascript
new verymodel.Model({someDateField: {
    processIn: function (value) {
        return moment(value);
    },
})
```

----

<a name='def-processOut'></a>
__processOut__

`processOut` is a function that takes a value and returns a value, just like `processIn`, but is typically used to serialize the value for storage. It runs on `toJSON()`.

Example:

```javascript
new verymodel.Model({someDateField: {
    processOut: function (value) {
        return value.format(); //turn moment into string
    },
})
```

----

<a name='def-processors'></a>
__processors__

`processors` is an object that contains functions that takes a value and returns a value, just like `processIn` and `processOut`, but only run when you call `create` or `toJSON` with the option of processors with an array item that matches the key to this function.

Example:

```javascript
var model = new verymodel.Model({name: {
    processors: {
        customProcessor: function (value) {
            return value + '!'; //turn moment into string
        }
    }
});

model.create({someDateField: 'Fritzy'}, {processors: ['customProcessor']});
console.log(model.name); // Fritzy!

```

----
<a name='def-onSet'></a>
__onSet__

`onSet` is just like `processIn`, except that it only runs on direct assignment. It's a function that takes a value and returns a value.

Example:

```javascript
new verymodel.Model({someDateField: {
    processIn: function (value) {
        return moment(value);
    },
    onSet: function (value) {
        if (moment.isMoment(value)) {
            return value;
        } else {
            return moment(value);
        }
    },
    processOut: function (value) {
        return value.format();
    },
})
```

----

<a name='def-derive'></a>
__derive__

`derive` is a function that returns a value whenever the field is accessed (which can be quite frequent). The `this` context, is the current model instance, so you can access other fields.

Example:

```js
new verymodel.Model({
    firstName: {type: 'string'},
    lastName: {type: 'string'},
    fullName: {
        type: 'string',
        derive: function () {
            return [this.firstName, this.lastName].join(" ");
        },
    }
});
```
:heavy\_exclamation\_mark: Warning! DO NOT REFERENCE THE DERIVE FIELD WITHIN ITS DERIVE FUNCTION! You will cause an infinite recursion. This is bad and will crash your program.

----


<a name='def-default'></a>
__default__

`default` may be a value or a function.
In function form, `default` behaves similarly to `derive`, except that it only executes once.

```js
new verymodel.Model({
    comment: {
        type: 'string',
        default: function () {
            return this.author.fullName + ' has nothing to say.';
        },
    },
    author: {foreignKey: 'user'},
    starredBy: {foreignCollection: 'user'}
});
```

:heavy\_exclamation\_mark: Warning! Assigning mutable objects as a default can result in the default getting changed over time.
When assigning objects, arrays, or essentially any advanced type, set default to a function that returns a new instance of the object.

---

<a name='def-private'></a>
__private__

`private` is a boolean, false by default, which determines whether a field is included in the object resulting from [toJSON()](#toJSON).

<a name='model-factory-methods'></a>
## Model Factory Methods

* [create](#create)
* [exportJoi](#exportJoi)

<a name="create"></a>
__create(value_object, options)__

Returns a factory instance model.

Create makes a new instance of the model with specific data.
Any fields in the `value_object` that were not defined get thrown out.
Validations are not done on creation, but some values may be processed based on the field definition type and `processIn` functions.

Logging the model out to console will produce a confusing result.
If you want the model's data, run `.toJSON()` and use the result.

Options:

* processors: Array of strings listing which custom [processors](#def-processors) to run in each fields definition for `processor`

Example:

```js
//assuming Person is a defined Model Factory
var person = Person.create({
    firstName: 'Nathan',
    lastName: 'Fritz',
});
```

<a name="exportJoi"></a>
__exportJoi(fields)__

Returns a Joi.object() of all of the field definitions that include joi validators.
Useful for using in hapi validators and validating without a model instance.

Arguments:

 * fields - An optional array of fields to include, or an object with a root property of fields, and other properties of submodel fields

## Model Instance Methods

* [toJSON](#toJSON)
* [toString](#toString)
* [diff](#diff)
* [getChanges](#getChanges)
* [getOldModel](#getOldModel)
* [loadData](#loadData)

---

<a name="toJSON"></a>
__toJSON(flags)__

Outputs a JSON style object from the model.

Options:

* noDepth: false by default. If true, does not recursively toJSON objects like [model](#def-model)s and [collection](#def-collection)s.
* withPrivate: false by default. If true, includes fields with [private](#def-private) set to true.
* processors: list of processors to run.


Example:

You want an example? Look at all of the other examples... most of them use [toJSON](#toJSON).


:point\_up: [toJSON](#toJSON) does not produce a string, but an object. See: [toString](#toString).

----

<a name="toString"></a>
__toString()__

Just like [toJSON](#toJSON), but produces a JSON string rather than an object.

----

<a name="diff"></a>
__diff(other)__

Arguments:

* other: model instance to compare this one to.

Result: object of each field with left, and right values.

```js
{
    firstName: {left: 'Nathan', right: 'Sam'},
    lastName: {left: 'Fritz', right: 'Fritz'},
}
```


----

<a name="getChanges"></a>
__getChanges()__

Get the changes since [create](#create).

Result: object of each field with then, now, and changed boolean.

```js
{
    body: {then: "I dont liek cheese.", now: "I don't like cheese.", changed: true},
    updated: {then: '2014-02-10 11:11:11', now: '2014-02-10 12:12:12', changed: true},
    created: {then: '2014-02-10 11:11:11', now: '2014-02-10 11:11:11', changed: false},
}
```

----

<a name="getOldModel"></a>
__getOldModel()__

Get a new model instance of this instance with all of the changes since [create](#create) reversed.

Result: Model instance.

----

<a name="loadData"></a>
__loadData()__

Loads data just like when a model instance is retrieved or [create](#create)d.

[processIn](#def-processIn) is called on any fields specified, but [onSet](#def-onSet) is not.

Essentially the same things happen as when running [create](#create) but can be done after the model instance is initialized.

Example:

```javascript
var person = Person.create({
    firstName: 'Nathan',
    lastName: 'Fritz',
});

person.favoriteColor = 'blue';

person.loadData({
    favoriteColor: 'green',
    favoriteFood: 'burrito',
});

console.log(person.toJSON());
// {firstName: 'Nathan', lastName: 'Fritz', favoriteFood: 'burrito', favoriteColor: 'green'}
``

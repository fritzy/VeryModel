VeryModel
=========

A JavaScript model system for validation, creation, and editing of models.

I wrote this because the robust model systems that I found were tightly integrated with frameworks, or only served to be useful for validation.  
VeryModel is not tied to a framework, and it implements a full purpose Model system.

## OK, But What Is It?

Models are useful for managing the lifecycle of an object.  
They are commonly used for framework ORMs (Object Relational Managers) and the M in MVC (Model-View-Controller) patterns like Backbone.js.

### Load Network Data, Giving Proper Errors, Save It

Pretend we're working in Node.js Express,  
using VeryModel as an ORM to save, load, and validate models.

```javascript 
function goodPassword(password) {
    //test for password being strong
    //would go here
    return true;
}

//Create a User Factory
var User = new VeryModel({
    id: {primary: true, type: VeryType().isAlphanumeric(), default: 1},
    username: {required: true, type: VeryType().isAlphanumeric().len(4, 25), default: ''},
    password: {required: false, type: VeryType().len(6).custom(goodPassword)}, default: ''},
    passhash: {private: true},
});

User.setSave(function(model, cb) {
    if (model.password) {
        model.passhash = sha1(model.password + 'static salt');
        model.password = undefined;
    }
    riak.put(model.id, model.__toJSON({withPrivate: true}), cb);
});

User.setLoad(function(id, cb) {
    riak.get(id, function (err, data) {
        var model = this.create(data);
        cb(err, model);
    });
});

this.post = function (req, res) {
    var user = User.create(req.body);
    var errors = user.__validate();
    if (errors.length > 0) {
        res.send(400, errors.join('\n'));
    } else {
        var uid = uuid();
        user.id = uid;
        user.__save(function() {
            res.send(201, user.__toObject());
        });
    }
};
```


### Create a fresh object with default values.

We can also create empty/default objects to work with as a starting point.

```javascript
this.new = function (req, res) {
    res.send(200, User.create().__toObject());
};
```

Which would send

    {id: 1, username: '', password: ''}

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
    var errors = args.__validate();
    args.cb(errors, args.type, args.msg, args.save);
}

doIt('hi there', function(err, type, msg, save) {
    console.log("Made it!");
});
```

## Install

`npm install verymodel`

## API

### VeryType

### Definition

Model defintions are recursive Javascript object. At each layer, you can have the following fields:

* `required` (boolean): Error on validation if this field isn't set.
* `type` (VeryType): VeryType chain to validate field against if set.
* `default` (any): Default value set automatically.
* `model` (definition object or VeryModel): set this field as another model.
* `collection` (definition object or VeryModel): set this field as a collection of a model.
* `derive` `function`): Derive the value of this field with this function whenever field is accessed
    `{derive: function(model) {return model.first + ' ' + model.last}`
* `depends` ({some_other_field: VeryType or true}, ...): Require other fields when this field is set, optionally run VeryType chain check on other field.
* `primary` (boolean): Set this on one of your fiels for easy saving and loading.
* `private` (boolean): `__toObject()` will not include this field in expect unless the argumnet usePrivate is true

#### Example Definition

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

### Models

Models can be treated like normal objects. Each field has a getter/setter.
Models also refer to their `__parent`

`__loadData(data)`

Rather than setting fields individually, set them en masse with an object.

`__toObject()`

Export an object with no getters, setters, state, etc... just the object with derived fields.

`__validate()`

returns an array of error strings.

`__toJSON()`

helper for `JSON.stringify(model.__toObject());`


### VeryModel

This class interprets defintions and spawns models from `create`.

Initialize with a definition.

    var MajorGeneral = new VeryModel(generaldef);
    var stanley = MajorGeneral.create({
        name: {title: 'Major-General', last: 'Stanley'},
        rank: 'Major-General',
        knowledge: [{name: 'animalculous', category: 'animal'}, {name: 'calculus', category: 'mathmatical'}]
    });
    var errors = stanley.__validate();
    console.log(errors);

Output:

    [ 'knowledge[1].category: Unexpected value or invalid argument' ]

Turns out he knows more than just animals, vegetables, minerals.

    stanley.knowledge[1].category = 'vegetable';

That ought to do it.
    
    var errors = stanley.__validate();
    console.log(errors);

Output:

    []

Let's see what our object looks like:

    console.log(stanley.__toObject());

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

VeryModel
=========

A JavaScript model system for validation, creation, and editing of models.

## API

### VeryType

### Definition

Model defintions are recursive Javascript object. At each layer, you can have the following fields:

`required` (boolean)

`type` (`VeryType`)

`default` (any)

`model` (definition object or `VeryModel`)

`modelArray` (definition object or `VeryModel`)

`derive` (`function`)

`depends` (`{some_other_field: VeryType}, ...`)

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


### `VeryModel`

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


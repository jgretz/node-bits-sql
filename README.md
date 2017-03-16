# node-bits-sql
The SQL node bit wraps Sequelize (http://sequelizejs.com/) into a bit, exposing the database contract, thus allowing it to easily be used by other bits.

## Install
```
npm install node-bits-sql --save
```

or

```
yarn add node-bits-sql
```

## Configuration
Due to the way Sequelize is configured, and my desire to keep the bit thin, you will need to add a dependency to Sequelize and your chosen database. Please follow the instructions listed at http://docs.sequelizejs.com/en/v3/docs/getting-started/

For example, to use a postgresql db:

```
npm install sequelize pg pg-hstore --save
```
then configure the bit like so

```
nodeBitsSql({
  connection: () => new Sequelize('your connection string'),
}),
```

### connection
As mentioned above, you need to handle the actual connection to sequelize. node-bits-sql expects to find a function at the connection property that returns that sequelize object.

### runSeeds
If runSeeds is included and set to true, node-bits-sql will look for seeds as defined in the schema and insert them into the database.

Seeds are expected to be in the form of the latest version of the schema.

### runMigrations
If runMigrations is included and set to true, node-bits-sql will look for migrations as defined in the schema and execute them as appropriate.

Migrations should be used once a database has been released and has 'real' data that cannot be lost. The schema defined by other bits is expected to always be the "latest".

Migrations are run in semantic versioning order. When a database is created, it is assumed that it is at the most "recent" version. When the node-bits runtime is started, the node-bits-sql bit will check the version of the database and run any migrations found that are "newer" than the current version of the db.

A migrations version is denoted by the name of the file, for example ```0.0.1.js```. This file should return a js object that has two methods: up and down. Each has the signature: ```(queryInterface, sequelize)```. These methods should then migrate the database as desired using the methods found in the [sequelize migration documentation](http://docs.sequelizejs.com/en/v3/docs/migrations/). Its important to note that if you choose to use node-bits-sql to run your migrations, you should not use the sequelize cli (and visa versa).

forceSync and runMigrations are mutually exclusive. If both are true, forceSync will be used.

### forceSync
If runMigrations is included and set to true, node-bits-sql will set the force parameter to true when calling sync. This will have the effect of ALL tables defined in the schema being dropped and recreated each time the node-bits runtime is restarted.

forceSync and runMigrations are mutually exclusive. If both are true, forceSync will be used.

Using forceSync and runSeeds is often helpful in development to quickly spin up an environment, but forceSync should not be used in QA or Production.

### hooks
hooks is an array of functions that accepts a single args parameter. The property values  passed to args and optional actions varies by operation and are described below:

##### Before execution
* name: the name of the model
* schema: the defined schema object for this model
* action: QUERY, INSERT, UPDATE, DELETE
* stage: BEFORE, AFTER
* options: these are the options passed to the database on the query

Any value returned will be used as the options forward. If you do not want this effect, return null.

##### After Execution
* name: the name of the model
* schema: the defined schema object for this model
* action: QUERY, INSERT, UPDATE, DELETE
* stage: BEFORE, AFTER
* options: these are the options passed to the database on the query
* results: the results returned by the database

#### node-bits-password
[node-bits-password](https://github.com/jgretz/node-bits-password) implements the logic for the PASSWORD type fields and is a common hook. See the bit's documentation for more information.

## Relationships
To define a relationship, you need to define the model, the reference, and the type. By specifying relationship, the database bit will create the implied columns and foreign keys.

```
import { MANY_TO_ONE } from 'node-bits';

export const order_customer = {
  model: 'order',
  references: 'customer',
  type: MANY_TO_ONE,
}
```

In addition, you can specify whether to include the related object in queries and/or updates. This is done by the following config settings:

```
{
  includeInSelect: true, // default false
  includeInUpdate: true, // default false
}
```

The includeInSelect option also accepts a complex object with more specific flags to configure which direction to include the relation on:

```
{
  model: true, // default false
  reverse: true, // default false
  separate: true, // default false - read about this option here: http://docs.sequelizejs.com/
}
```

## Methods

### connect
This will open a connection to the database.

### rawConnection
Sometimes you need the raw mongo connection to do something that node-bits-mongo hasn't exposed. This method will return the [mongoosejs](http://mongoosejs.com/) connection to you.

### getModel
```
getModel(name)
```

This will return to you the mongoosejs model.

### findById
```
findById(name, id)
```

The name of the model, the id to search for.

Will return an object if found, if not will return null.

### find
```
find(name, options)
```

The name of the model, the options to use for searching.

Will return the results for the options supplied, null is supplied, it will return all records for the model

#### Options
All options are not required and can be used in any combination.

* select: an array of field names to include in the results
* orderby: an array of objects that define the order of the result. The format of is item is as follows: ```{field: '', direction: ''}```.
* start: the index of the result set to start from (alternatively parameter can be named skip)
* max: the number of records to return in the results (alternatively parameter can be named limit)
* where: a complex object that contains the
* includeMetaData: an array of options to return wrapped around the result set. If supplied the format of the result will be ```value:[rows], ...{keys as supplied}```

##### Where
The where clause is specified as a complex object made up of key, value pairs. Many times the values for a key are a complex object themselves, representing the operations and values.

node-bits-sql supports the following operators: eq, ne, gt, ge, lt, le, like, startsWith, endsWith, and, or.

Example (all orders with a total greater than or equal to $5.00):
```
database.find('order', {
  where: {
    total: { ge: 5 },
  },
};
```

##### Include Meta Data
The following options are understood for metadata, and the constants can be found in node-bits.

* COUNT
* START
* MAX

To allow for different return keys, the format of each item in the array is as follows: ```{key: '', value: ''}```

### create
```
create(name, data)
```

The name of the model, the data to insert.

Will return the object inserted with all autogenerated fields

### update
```
update(name, id, data)
```

The name of the model, the id of the record to update, the data to use as the new version of the object.

Will return the object updated with all autogenerated fields

### delete
```
delete(name, id)
```

The name of the model, the id of the object to delete.

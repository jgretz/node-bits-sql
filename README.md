# NodeBits-Sql
The SQL node bit wraps Sequelize (http://sequelizejs.com/) into a bit, exposing the database contract, thus allowing it to easily be used by other bits.

Due to the way Sequelize is configured, and my desire to keep the bit thin, you will need to add a dependency to Sequelize and your chosen database. Please follow the instructions listed at http://docs.sequelizejs.com/en/v3/docs/getting-started/

For example, to use a postgresql db:

```
npm install sequelize pg pg-hstore --save
```
then configure the bit like so

```
nodeBitsSql({
  connect: () => {
    return new Sequelize('your connection string');
  },
}),
```

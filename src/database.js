import _ from 'lodash';
import {
  logWarning, logError, executeSeries,
  COUNT, START, MAX,
} from 'node-bits';
import {Database} from 'node-bits-internal-database';

import {
  flattenSchema, mapComplexType, defineRelationships, defineIndexesForSchema,
  runMigrations, runSeeds,
  buildOptions, buildOptionsForCount,
} from './util';

import {READ, WRITE} from './constants';

// helpers
const mapSchema = schema => _.mapValues(schema, value => mapComplexType(value));

const findOld = (database, model, args) => {
  const options = buildOptions(READ, model, database, args);
  const ops = {...options, where: args.backwardsQuery};

  return model.findAll(ops).then(result => result.map(item => item.dataValues));
};

// configure the sequelize specific logic
let sequelize = null;
let database = {};

class Implementation {
  // connect
  connect(config) {
    sequelize = config.connection();
    sequelize.authenticate()
      .catch(err => {
        logError('Unable to authenticate database connection: ', err);
        sequelize = null;
      });
  }

  rawConnection() {
    return sequelize;
  }

  // schema
  updateSchema(name, schema, db) {
    return sequelize.define(name, mapSchema(schema), defineIndexesForSchema(name, db));
  }

  removeSchema(name, model) {
    if (model) {
      model.drop();
    }
  }

  beforeSynchronizeSchema(config, db) {
    return flattenSchema(db);
  }

  afterSynchronizeSchema(config, models, db) {
    const {forceSync} = config;
    if (forceSync && config.runMigrations) {
      logWarning(`forceSync and runMigrations are mutually exclusive.
        node-bits-sql will prefer forceSync and not run migrations.`);
    }

    const shouldRunMigrations = config.runMigrations && !forceSync;
    const tasks = [
      () => shouldRunMigrations ? runMigrations(sequelize, db.migrations) : Promise.resolve(),
      () => sequelize.sync({force: forceSync}),
      () => config.runSeeds ? runSeeds(sequelize, models, db, forceSync) : Promise.resolve(),
    ];

    executeSeries(tasks)
      .catch(err => {
        // see if this is a DatabaseError
        if (err.sql) {
          logError(`${err.sql}\ncaused ${err.parent}`);
        } else {
          logError(err);
        }
      });

    database = {db, models, sequelize};
  }

  defineRelationships(config, models, db) {
    defineRelationships(sequelize, models, db);
  }

  // CRUD
  findById(model, args) {
    return model.findById(args.id, buildOptions(READ, model, database, args))
      .then(result => result ? result.dataValues : null);
  }

  find(model, args) {
    // support backwards compatibility for now
    if (args.backwardsQuery) {
      return findOld(database, model, args);
    }

    // build the options
    const options = buildOptions(READ, model, database, args);

    // helper functions for repeated code
    const mapMeta = {
      [COUNT]: meta => meta.count,
      [START]: () => options.start,
      [MAX]: () => options.max,
    };

console.log('options to db: ', options.where);

    const findAll = () => model.findAll(options).then(result => result.map(item => item.dataValues));
    const wrap = (value, meta) => {
      const result = {value};

      _.forEach(args.includeMetaData, item => {
        const map = mapMeta[item.value];
        if (map) {
          result[item.key] = map(meta);
        }
      });

      return result;
    };

    // simple
    if (!args.includeMetaData) {
      return findAll();
    }

    // non-count meta data
    const shouldCount = args.includeMetaData && _.some(args.includeMetaData, x => x.value === COUNT);
    if (!shouldCount) {
      return findAll().then(wrap);
    }

    // get the count then return
    // we can't use findAndCount because it counts all the included models as well
    const countOptions = buildOptionsForCount(READ, model, database, args);
    return model.count(countOptions)
    .then(count => findAll().then(value => wrap(value, {count})));
  }

  create(model, args) {
    const options = buildOptions(WRITE, model, database, args);
    return model.create(args.data, {returning: true, ...options});
  }

  update(model, args) {
    const options = buildOptions(WRITE, model, database, args);
    return model.update(args.data, {...options, where: {id: args.id}});
  }

  delete(model, args) {
    return model.destroy({where: {id: args.id}});
  }
}

// export the database
export default config => new Database(config, new Implementation());

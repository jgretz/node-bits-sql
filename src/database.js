import _ from 'lodash';
import { logWarning, logError, executeSeries } from 'node-bits';
import { Database } from 'node-bits-internal-database';

import {
  flattenSchema, mapComplexType, defineRelationships, defineIndexesForSchema,
  runMigrations, runSeeds,
} from './util';

// helpers
const mapSchema = (schema) => {
  return _.mapValues(schema, (value) => mapComplexType(value));
};

// configure the sequelize specific logic
let sequelize = null;

const implementation = {
  // connect
  connect(config) {
    sequelize = config.connection();
    sequelize.authenticate()
      .catch((err) => {
        logError('Unable to authenticate database connection: ', err);
        sequelize = null;
      });
  },

  rawConnection() {
    return sequelize;
  },

  //schema
  updateSchema(name, schema, db) {
    return sequelize.define(name, mapSchema(schema), defineIndexesForSchema(name, db));
  },

  removeSchema(name, model) {
    if (model) {
      model.drop();
    }
  },

  beforeSynchronizeSchema(config, db) {
    return flattenSchema(db);
  },

  afterSynchronizeSchema(config, models, db) {
    const { forceSync } = config;
    if (forceSync && config.runMigrations) {
      logWarning(`forceSync and runMigrations are mutually exclusive.
        node-bits-sql will prefer forceSync and not run migrations.`);
    }

    const shouldRunMigrations = config.runMigrations && !forceSync;
    const tasks = [
      () => shouldRunMigrations ? runMigrations(sequelize, db.migrations) : Promise.resolve(),
      () => sequelize.sync({ force: forceSync }),
      () => config.runSeeds ? runSeeds(sequelize, models, db, forceSync) : Promise.resolve(),
    ];

    executeSeries(tasks)
      .catch(logError);
  },

  defineRelationships(config, models, db) {
    defineRelationships(models, db);
  },

  // CRUD
  findById(model, args) {
    return model.findById(args.id)
      .then(result => result ? result.dataValues : null);
  },

  find(model, args) {
    return model.findAll({ where: args.query })
      .then(result => result.map(item => item.dataValues));
  },

  create(model, args) {
    return model.create(args.data, { returning: true });
  },

  update(model, args) {
    return model.update(args.data, { where: { id: args.id } });
  },

  delete(model, args) {
    return model.destroy({ where: { id: args.id } });
  }
};

// export the database
export default (config) => {
  return new Database(config, implementation);
};

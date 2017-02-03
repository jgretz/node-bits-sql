import _ from 'lodash';
import { logWarning, logError } from 'node-bits';
import { Database } from 'node-bits-internal-database';

import { flattenSchema } from './flatten_schema';
import { mapComplexType } from './map_complex_type';
import { defineIndexesForSchema } from './define_indexes_for_schema';
import { runMigrations } from './run_migrations';

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
    runMigrations(sequelize, db.migrations);

    sequelize.sync({ force: config.forceSync });
  },

  defineRelationships(config, models, db) {
    const logic = {
      ONE_TO_ONE: (model, reference) => model.belongsTo(reference),
      ONE_TO_MANY: (model, reference) => reference.hasMany(model),
      MANY_TO_MANY: (model, reference) => model.belongsToMany(reference, {
        through:`${model.getTableName()}_${reference.getTableName()}`
      }),
    };

    _.forEach(db.relationships, (rel) => {
      const model = models[rel.model];
      const reference = models[rel.references];
      const apply = logic[rel.type];

      if (!model || !reference || !apply) {
        logWarning(`This relationship has not been added due to a misconfiguration
          ${JSON.stringify(rel)}`);
        return;
      }

      logic[rel.type](model, reference);
    });
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

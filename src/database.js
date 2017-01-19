import _ from 'lodash';
import { QUERY, INSERT, UPDATE, DELETE, BEFORE, AFTER } from 'node-bits';

import { mapFuncType, mapComplexType } from './util';

// helpers
const mapField = (value) => {
  let definition = value;
  if (_.isFunction(value)) {
    definition = { type: mapFuncType(value) };
  }

  return mapComplexType(definition);
};

const mapSchema = (sequelize, name, schema) => {
  const mapped = _.mapValues(schema, (value, key) => {
    if (_.isArray(value)) {
      // we don't support this right now, define everything as 1st level
      return null;
    }

    return mapField(value, key);
  });

  return _.omitBy(mapped, _.isNull);
};

// Sql Class
export default class Sql {
  constructor(config) {
    this.config = config;
    this.models = [];
  }

  // connection
  connect() {
    this.sequelize = this.config.connect();
    this.sequelize.authenticate()
      .catch(() => { this.sequelize = null; });
  }

  // schema management
  synchronizeSchema(schema) {
    this.definedSchema = schema;

    const keys = _.keys(schema);

    _.forEach(keys, (key) => {
      this.updateSchema(key, schema[key]);
    });

    this.sequelize.sync({ force: this.config.forceSync });
  }

  updateSchema(name, schema) {
    this.removeSchema(name);

    this.models[name] = this.sequelize.define(name, mapSchema(this.sequelize, name, schema));
  }

  removeSchema(name) {
    const model = this.model(name);
    if (model) {
      model.drop();
    }
  }

  model(name) {
    return this.models[name];
  }

  // crud
  execute(name, action, args, logic) {
    const hooks = this.config.hooks || [];
    const meta = { name, action, schema: this.definedSchema[name] };

    // this will call the hooks with the situation, allowing it to change the args or result
    // based on the stage
    const callHooks = (stage, changeable) => {
      return _.reduce(hooks, (inbound, hook) => {
        const result = hook({ ...meta, stage, ...inbound });
        return result ? result : inbound;
      }, changeable);
    };

    // It goes logically :) - BEFORE hooks, call, AFTER hooks
    return new Promise((resolve, reject) => {
      try {
        const resolvedArgs = callHooks(BEFORE, args);

        logic(this.model(name), resolvedArgs)
          .then((result) => {
            const resolvedResponse = callHooks(AFTER, { result });

            resolve(resolvedResponse.result);
          })
          .catch(reject);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  }

  findById(name, id) {
    const logic = (model, args) => model.findById(args.id)
      .then(result => result ? result.dataValues : null);

    return this.execute(name, QUERY, { id }, logic);
  }

  find(name, query) {
    const logic = (model, args) => model.findAll({ where: args.query })
      .then(result => result.map(item => item.dataValues));

    return this.execute(name, QUERY, { query }, logic);
  }

  create(name, data) {
    const logic = (model, args) => model.create(args.data, { returning: true });

    return this.execute(name, INSERT, { data }, logic);
  }

  update(name, id, data) {
    const logic = (model, args) => model.update(args.data, { where: { id: args.id } });

    return this.execute(name, UPDATE, { id, data }, logic);
  }

  delete(name, id) {
    const logic = (model, args) => model.destroy({ where: { id: args.id } });

    return this.execute(name, DELETE, { id }, logic);
  }
}

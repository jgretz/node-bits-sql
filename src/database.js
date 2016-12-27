import _ from 'lodash';
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
  findById(name, id) {
    return this.model(name).findById(id);
  }

  find(name, query) {
    return this.model(name).findAll({ where: query });
  }

  create(name, data) {
    return this.model(name).create(data, { returning: true });
  }

  update(name, id, data) {
    return this.model(name).update(data, { where: { id } });
  }

  delete(name, id) {
    return this.model(name).destroy({ where: { id } });
  }
}

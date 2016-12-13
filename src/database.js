import _ from 'lodash';
import Sequelize from 'sequelize';

// database types
export const INTEGER = 'INTEGER';
export const DECIMAL = 'DECIMAL';
export const DOUBLE = 'DOUBLE';
export const FLOAT = 'FLOAT';
export const UUID = 'UUID';

const map = {
  INTEGER: Sequelize.INTEGER,
  DECIMAL: Sequelize.DECIMAL,
  DOUBLE: Sequelize.DOUBLE,
  FLOAT: Sequelize.FLOAT,
  UUID: Sequelize.UUID,
};

const mapType = (value) => {
  switch (value) {
    case Number:
      return Sequelize.DECIMAL;

    case String:
      return Sequelize.STRING;

    case Date:
      return Sequelize.DATE;

    case Boolean:
      return Sequelize.BOOLEAN;

    default:
      return undefined;
  }
};

const mapField = (value) => {
  if (_.isFunction(value)) {
    return { type: mapType(value) };
  }

  const type = map[value.type];
  if (!type) {
    return undefined;
  }

  // construct field this way so that we can handle the defaults
  const {
    allowNull = true, unique = false, defaultValue = null, autoIncrement = false,
    precision = null, scale = null,
  } = value;

  return { type, allowNull, unique, defaultValue, autoIncrement, precision, scale };
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

    this.sequelize.sync();
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

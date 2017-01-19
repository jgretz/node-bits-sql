import _ from 'lodash';
import { Database } from 'node-bits-internal-database';

import { mapComplexType } from './map_complex_type';

// helpers
const mapSchema = (schema) => {
  const mapped = _.mapValues(schema, (value) => {
    if (_.isArray(value)) {
      // we don't support this right now, define everything as 1st level
      return null;
    }

    return mapComplexType(value);
  });

  return _.omitBy(mapped, _.isNull);
};

// configure the sequel specific logic
let sequelize = null;

const implementation = {
  connect(connection) {
    sequelize = connection();
    sequelize.authenticate()
      .catch(() => { sequelize = null; });
  },

  afterSynchronizeSchema(forceSync) {
    sequelize.sync({ force: forceSync });
  },

  updateSchema(name, schema) {
    return sequelize.define(name, mapSchema(schema));
  },

  removeSchema(name, model) {
    if (model) {
      model.drop();
    }
  },

  // CRUD
  findById(model, args) {
    return model.findById(args.id)
      .then(result => result.length === 0 ? null : result.dataValues);
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

import _ from 'lodash';
import Sequelize from 'sequelize';

import { mapFuncType } from './map_func_type';

// map to get the sequelize type definition
const map = {
  INTEGER: (size, precision, scale) =>
    precision ? Sequelize.INTEGER(precision, scale) : Sequelize.INTEGER,

  DECIMAL: (size, precision, scale) =>
    precision ? Sequelize.DECIMAL(precision, scale) : Sequelize.DECIMAL,

  DOUBLE: (size, precision, scale) =>
    precision ? Sequelize.DOUBLE(precision, scale) : Sequelize.DOUBLE,

  FLOAT: (size, precision, scale) =>
    precision ? Sequelize.FLOAT(precision, scale) : Sequelize.FLOAT,

  UUID: () => Sequelize.UUID,

  STRING: (size) => size ? Sequelize.STRING(size) : Sequelize.STRING,

  PASSWORD: (size) => size ? Sequelize.STRING(size) : Sequelize.STRING,

  DATE: () => Sequelize.DATE,

  BOOLEAN: () => Sequelize.BOOLEAN,
};

const resolveType = (defType, size, precision, scale) => {
  let internalType = defType;
  if (_.isFunction(defType)) {
    internalType = mapFuncType(defType);
  }

  const resolve = map[internalType];
  return resolve ? resolve(size, precision, scale) : undefined;
};

export const mapComplexType = (definition) => {
  // break apart so we can set defaults
  const {
    type, size = null, precision = null, scale = null,
    allowNull = true, unique = false, defaultValue = null, autoIncrement = false,
  } = definition;

  // map the type to the proper sequelize definition
  const resolvedType = resolveType(type, size, precision, scale);
  if (!resolvedType) {
    return undefined;
  }

  // return the sequelize definition
  return { type: resolvedType, allowNull, unique, defaultValue, autoIncrement };
};

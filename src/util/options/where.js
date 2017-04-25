/* eslint-disable no-use-before-define */
import _ from 'lodash';

const operatorMap = {
  eq: '$eq',
  ne: '$ne',
  gt: '$gt',
  ge: '$gte',
  gte: '$gte',
  lt: '$lt',
  le: '$lte',
  lte: '$lte',
  and: '$and',
  or: '$or',
  like: '$like',
  startsWith: '$like',
  endsWith: '$like',
};

const literalMap = {
  like: node => `%${node}%`,
  startsWith: node => `${node}%`,
  endsWith: node => `%${node}`,
};

const functionArgValueMap = {
  literal: arg => arg.value,
  property: (arg, sequelize) => sequelize.col(arg.name),
};

const mapArgValue = (arg, sequelize, literalMap) => {
  const map = functionArgValueMap[arg.type];
  if (!map) {
    throw new Error(`Unsupported argument type - ${root.type}`);
  }

  const mappedValue = map(arg, sequelize);

  return literalMap ? literalMap(mappedValue) : mappedValue;
};

const functionMap = {
  tolower: ({args, sequelize, key}) => sequelize.fn('lower', mapArgValue(args[0], sequelize, literalMap[key])),
};

const mapKey = key => {
  const operator = operatorMap[key];
  if (operator) {
    return operator;
  }

  if (key.includes('.')) {
    return `$${key}$`;
  }

  return key;
};

const mapNode = (node, sequelize) => {
  if (_.isArray(node)) {
    return node.map(inner => mapNode(inner, sequelize));
  }

  if (_.isObject(node)) {
    return _.reduce(node, (result, value, key) => {
      const mappedKey = mapKey(key);
      let mappedValue = '';

      if (_.isUndefined(node.leftFunc) === false) {
        mappedValue = mapNode(node.compare, sequelize);
        return {...result, $col: sequelize.where(functionMap[node.leftFunc.func]({args: node.leftFunc.args, sequelize}), mappedValue)};
      }

      if (_.isUndefined(value.func) === false) {
        mappedValue = functionMap[value.func]({args: value.args, sequelize, key});
        return {...result, [mappedKey]: mappedValue};
      }

      // no functions for values
      mappedValue = mapNode(value, sequelize);

      const translate = literalMap[key];
      if (translate) {
        mappedValue = translate(mappedValue);
      }

      return {...result, [mappedKey]: mappedValue};
    }, {});
  }

  return node;
};

export const buildWhere = (args, models, relationships, database) => {
  const {sequelize} = database;
console.log(JSON.stringify(args.where));
  if (!args.where || _.keys(args.where).length === 0) {
    return undefined; // eslint-disable-line
  }
try {
  return mapNode(args.where, sequelize);
}catch(ex) {
  console.log(ex);
  throw ex;
}
};

/* eslint-disable no-use-before-define */
import _ from 'lodash';

const operatorMap = {
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
  console.log('inputNode : ', node, _.isUndefined(node.leftFunc));
  if (_.isArray(node)) {
    return node.map(inner => mapNode(inner, sequelize));
  }

  if (_.isObject(node)) {
    return _.reduce(node, (result, value, key) => {
      if (_.isUndefined(node.leftFunc)) {
        const mappedKey = mapKey(key);
        let mappedValue = mapNode(value, sequelize);

        const translate = literalMap[key];
        if (translate) {
          mappedValue = translate(mappedValue);
        }

        return {...result, [mappedKey]: mappedValue};
      }
console.log('compare node for function', node.compare);
console.log('mapped node for function', mapNode(node.compare, sequelize));
      const mappedValue = mapNode(node.compare, sequelize);
      return {...result, $col: sequelize.where(sequelize.fn('lower', sequelize.col('name')), mappedValue.$col ? mappedValue.$col : mappedValue)};
    }, {});
  }

  return node;
};

export const buildWhere = (args, models, relationships, database) => {
  if (!args.where || _.keys(args.where).length === 0) {
    return undefined; // eslint-disable-line
  }
console.log(JSON.stringify(args.where));
  const {sequelize} = database;

  return mapNode(args.where, sequelize);
};

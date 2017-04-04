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

const mapNode = node => {
  if (_.isArray(node)) {
    return node.map(inner => mapNode(inner));
  }

  if (_.isObject(node)) {
    return _.reduce(node, (result, value, key) => {
      const mappedKey = mapKey(key);
      let mappedValue = mapNode(value);

      const translate = literalMap[key];
      if (translate) {
        mappedValue = translate(mappedValue);
      }

      return {...result, [mappedKey]: mappedValue};
    }, {});
  }

  return node;
};

export const buildWhere = args => {
  if (!args.where || _.keys(args.where).length === 0) {
    return undefined; // eslint-disable-line
  }

  return mapNode(args.where);
};

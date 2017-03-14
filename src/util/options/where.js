import _ from 'lodash';

const operatorMap = {
  ne: '$ne',
  gt: '$ge',
  ge: '$gte',
  lt: '$lt',
  le: '$lte',
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
  return operator || key;
};

const mapNode = node => {
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

  if (_.isArray(node)) {
    return node.map(inner => mapNode(inner));
  }

  return node;
};

export const buildWhere = args => {
  if (!args.where) {
    return undefined; // eslint-disable-line
  }

  return mapNode(args.where);
};

import _ from 'lodash';
import { ONE_TO_ONE, MANY_TO_ONE } from 'node-bits';

const isTableDef = (value) => {
  if (_.isFunction(value)) {
    return false;
  }

  if (value.type) {
    return false;
  }

  return true;
};

export const flattenSchema = (db) => {
  const result = { ...db, schema: {} };

  const flattenNode = (key, node) => {
    const nodeResult = {};

    _.forOwn(node, (value, nodeKey) => {
      if (isTableDef(value)) {
        const oneToMany = _.isArray(value);
        const subNodeKey = `${key}${nodeKey}`;
        const subNode = oneToMany ? value[0] : value;

        // add the relationship
        result.relationships.push({
          model: subNodeKey,
          references: key,
          type: oneToMany ? MANY_TO_ONE : ONE_TO_ONE,
          includeInSelect: true,
          includeInWrite: true,
        });

        // add the table (recursive)
        flattenNode(subNodeKey, subNode);
        return;
      }

      nodeResult[nodeKey] = value;
    });

    result.schema[key] = nodeResult;
  };

  _.forOwn(db.schema, (value, key) => { flattenNode(key, value); });

  return result;
};

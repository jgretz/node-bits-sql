import _ from 'lodash';
import { logWarning } from 'node-bits';

export const defineIndexesForSchema = (name, db) => {
  const indexes = _.filter(db.indexes, index => index.model === name);

  const result = [];
  _.forEach(indexes, (index) => {
    const { fields, unique = false } = index;

    if (!fields) {
      logWarning(`This index has not been added due to a misconfiguration
        ${JSON.stringify(index)}`);
      return;
    }

    const mappedFields = fields.map(field => {
      if (_.isString(field)){
        return field;
      }

      return {
        attribute: field.field,
        order: field.desc ? 'DESC' : 'ASC',
      };
    });

    result.push({
      fields: mappedFields,
      unique,
    });
  });

  return { indexes: result };
};

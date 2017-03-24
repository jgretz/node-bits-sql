import _ from 'lodash';
import pluralize from 'pluralize';
import {logWarning} from 'node-bits';

export const buildOrderby = (args, models, relationships) => {
  if (!args.orderby) {
    return undefined; // eslint-disable-line
  }

  return args.orderby.map(item => {
    const path = item.field.split('.');

    // keep this for the next alias relationship search
    let last = null;
    const field = path.map((piece, index) => {
      if (index === path.length - 1) {
        return piece;
      }

      // account for alias columns
      const alias = _.find(relationships, rel => {
        if (last && !rel.model === last) {
          return false;
        }

        // others
        return rel.as === piece || rel.as === `${piece}Id`;
      });

      if (alias) {
        last = alias.references;
        return {model: models[alias.references], as: piece};
      }

      let model = models[piece];
      if (model) {
        return model;
      }

      model = models[pluralize.singular(piece)];
      if (model) {
        return model;
      }

      // do the last thing we can
      logWarning(`Expected to find a model named '${piece}' but was unable to`);
      return piece;
    });

    return [
      ...field,
      item.direction.toUpperCase(),
    ];
  });
};

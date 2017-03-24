import _ from 'lodash';

export const buildSelect = (args, model) => {
  if (!args.select) {
    return undefined; // eslint-disable-line
  }

  // this level is ONLY for the root model fields
  // this step filters out related objects and subtable columns which we support via include
  const keys = _.keys(model.attributes);
  return _.filter(args.select, item => keys.includes(item));
};

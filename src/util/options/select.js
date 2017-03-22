import _ from 'lodash';

export const buildSelect = (args, model) => {
  if (!args.select) {
    return undefined; // eslint-disable-line
  }

  const keys = _.keys(model.attributes); // this lets us include relationships, but not as columns
  return _.filter(args.select, item => keys.includes(item));
};

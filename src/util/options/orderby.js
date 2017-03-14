export const buildOrderby = args => {
  if (!args.orderby) {
    return undefined; // eslint-disable-line
  }

  return args.orderby.map(item => [item.field, item.direction.toUpperCase()]);
};

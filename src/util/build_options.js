import {buildInclude, buildWhere, buildPage, buildOrderby, buildSelect} from './options';


export const buildOptions = (mode, model, db, models, args) => {
  const include = buildInclude(mode, model, db, models, [], args.select || []);
  const where = buildWhere(args);
  const page = buildPage(args);
  const order = buildOrderby(args);
  const attributes = buildSelect(args, model);

  return {include, where, order, ...page, attributes};
};

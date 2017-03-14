import {buildInclude, buildWhere, buildPage, buildOrderby} from './options';


export const buildOptions = (mode, model, db, models, args) => {
  const include = buildInclude(mode, model, db, models, []);
  const where = buildWhere(args);
  const page = buildPage(args);
  const order = buildOrderby(args);

  return {include, where, order, ...page};
};

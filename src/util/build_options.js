import _ from 'lodash';

const buildInclude = (model, db, models, exclude) => {
  const include = db.relationships.map((rel) => {
    if (_.find(exclude, e => e === rel.model || e === rel.references)) {
      return null;
    }

    if (rel.model === model.name) {
      const related = models[rel.references];
      return {
        model: related,
        include: buildInclude(related, db, models, [...exclude, model.name]),
      };
    }

    if (rel.includeInSelect && rel.references === model.name) {
      const related = models[rel.model];
      return {
        model: related,
        include: buildInclude(related, db, models, [...exclude, model.name]),
      };
    }

    return null;
  });

  return _.filter(include, m => !_.isNil(m));
};

export const buildOptions = (model, db, models) => {
  return {
    include: buildInclude(model, db, models, []),
  };
};

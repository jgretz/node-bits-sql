import _ from 'lodash';

export const READ = 'READ';
export const WRITE = 'WRITE';

const buildInclude = (mode, model, db, models, exclude) => {
  const include = db.relationships.map(rel => {
    if (_.find(exclude, e => e === rel.model || e === rel.references)) {
      return null;
    }

    if (mode === READ && !rel.includeInSelect) {
      return null;
    }

    if (mode === WRITE && !rel.includeInWrite) {
      return null;
    }

    if (rel.model === model.name) {
      const related = models[rel.references];
      return {
        model: related,
        include: buildInclude(mode, related, db, models, [...exclude, model.name]),
      };
    }

    if (rel.references === model.name) {
      const related = models[rel.model];
      return {
        model: related,
        include: buildInclude(mode, related, db, models, [...exclude, model.name]),
      };
    }

    return null;
  });

  return _.filter(include, m => !_.isNil(m));
};

export const buildOptions = (mode, model, db, models) => {
  const include = buildInclude(mode, model, db, models, []);

  return {include};
};

import _ from 'lodash';
import {MANY_TO_ONE, MANY_TO_MANY} from 'node-bits';
import {foreignKeyRelationshipName} from './foreign_key_name';

export const READ = 'READ';
export const WRITE = 'WRITE';

const buildInclude = (mode, model, db, models, exclude) => {
  const include = db.relationships.map(rel => {
    if (_.find(exclude, e => e === rel.model || e === rel.references)) {
      return null;
    }

    let currentConfig = mode === WRITE
      ? rel.includeInWrite
      : rel.includeInSelect;

    if (!currentConfig) {
      return null;
    } else if (currentConfig === true) {
      currentConfig = {
        model: true,
        reverse: true,
        separate: false,
      };
    }
    if (rel.model === model.name && currentConfig.model) {
      const related = models[rel.references];
      return {
        as: foreignKeyRelationshipName(rel),
        model: related,
        include: buildInclude(mode, related, db, models, [...exclude, model.name]),
        separate: currentConfig.separate && (rel.type === MANY_TO_MANY || rel.type === MANY_TO_ONE),
      };
    }

    if (rel.references === model.name && currentConfig.reverse) {
      const related = models[rel.model];
      return {
        as: foreignKeyRelationshipName(rel),
        model: related,
        include: buildInclude(mode, related, db, models, [...exclude, model.name]),
        separate: currentConfig.separate && (rel.type === MANY_TO_MANY || rel.type === MANY_TO_ONE),
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

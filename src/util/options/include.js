import _ from 'lodash';
import {MANY_TO_ONE, MANY_TO_MANY} from 'node-bits';
import {foreignKeyRelationshipName, foreignKeyName} from '../foreign_key_name';
import {WRITE} from '../../constants';

const isFKIncludedInSelect = (isRoot, select, rel) => {
  if (!isRoot) {
    return true;
  }

  if (select.length === 0) {
    return true;
  }

  return select.includes(foreignKeyName(rel));
};

const isRelationshipIncludedInSelect = (isRoot, select, rel) => {
  if (!isRoot) {
    return true;
  }

  if (select.length === 0) {
    return true;
  }

  return select.includes(rel.model);
};

export const buildInclude = (mode, model, db, models, exclude, select) => {
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

    const isRoot = exclude.length === 0;

    if (rel.model === model.name && currentConfig.model) {
      if (!isFKIncludedInSelect(isRoot, select, rel)) {
        return null;
      }

      const related = models[rel.references];
      return {
        as: foreignKeyRelationshipName(rel),
        model: related,
        include: buildInclude(mode, related, db, models, [...exclude, model.name]),
        separate: currentConfig.separate && (rel.type === MANY_TO_MANY || rel.type === MANY_TO_ONE),
      };
    }

    if (rel.references === model.name && currentConfig.reverse) {
      if (!isRelationshipIncludedInSelect(isRoot, select, rel)) {
        return null;
      }

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

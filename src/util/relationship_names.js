export const foreignKeyRelationshipName = rel => {
  if (!rel.as) {
    return undefined; // eslint-disable-line
  }

  return rel.as.endsWith('Id') ? rel.as.slice(0, -2) : rel.as;
};

export const foreignKeyName = rel => {
  if (!rel.as) {
    return undefined; // eslint-disable-line
  }

  return rel.as.endsWith('Id') ? rel.as : `${rel.as}Id`;
};

export const manyToManyTableName = rel => rel.through || `${rel.model}_${rel.references}`;

import _ from 'lodash';
import Sequelize from 'sequelize';
import {logWarning} from 'node-bits';

const oneToOne = ({model, reference, rel}) => {
  const options = {as: rel.as};

  model.belongsTo(reference, options);
  reference.hasOne(model, options);
};

const oneToMany = ({model, reference, rel}) => {
  const foreignKey = rel.as ? `${rel.as}Id` : undefined; // eslint-disable-line
  model.hasMany(reference, {as: rel.as, foreignKey, sourceKey: rel.from});
  reference.belongsTo(model, {as: rel.as, foreignKey, targetKey: rel.from});
};

const manyToMany = ({sequelize, model, reference, rel, models}) => {
  // define join
  const joinName = rel.through || `${model.name}_${reference.name}`;
  const sourceId = rel.source || `${model.name}Id`;
  const targetId = rel.target || `${reference.name}Id`;
  const joinModel = sequelize.define(joinName, {
    id: {type: Sequelize.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true},
    [sourceId]: {type: Sequelize.INTEGER, allowNull: false},
    [targetId]: {type: Sequelize.INTEGER, allowNull: false},
  });
  models[joinName] = joinModel;

  // define relationships
  model.belongsToMany(reference, {through: joinModel, foreignKey: sourceId, targetKey: targetId});
  reference.belongsToMany(model, {through: joinModel, foreignKey: targetId, targetKey: sourceId});
};

const logicMap = {
  ONE_TO_ONE: oneToOne,
  ONE_TO_MANY: oneToMany,
  MANY_TO_ONE: ({model, reference, rel}) => {
    oneToMany({model: reference, reference: model, rel});
  },
  MANY_TO_MANY: manyToMany,
};

export const defineRelationships = (sequelize, models, db) => {
  _.forEach(db.relationships, rel => {
    const model = models[rel.model];
    const reference = models[rel.references];
    const apply = logicMap[rel.type];

    if (!model || !reference || !apply) {
      logWarning(`This relationship has not been added due to a misconfiguration
        ${JSON.stringify(rel)}`);
      return;
    }

    apply({sequelize, model, reference, rel, db, models});
  });
};

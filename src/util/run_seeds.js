import _ from 'lodash';
import {manyToManyTableName} from './relationship_names';
import Sequelize from 'sequelize';
import {log, logWarning, logError, executeSeries, MANY_TO_ONE, ONE_TO_MANY, ONE_TO_ONE,  MANY_TO_MANY} from 'node-bits';
import {resetAutoIncrement} from './reset_autoincrement';

const SEEDS = 'seeds';
const MODEL_MAP = {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  createdAt: {type: Sequelize.DATE},
  updatedAt: {type: Sequelize.DATE},
  name: {type: Sequelize.STRING},
};

const NO_SEEDS = 'Database ready ... No seeds to run.';
const SEEDS_RUN = 'Database ready ... Seeds planted.';

const getSeedHistory = (sequelize, forceSync) =>
  new Promise(resolve => {
    const resolveEmpty = () => resolve([]);
    const createSeeds = () =>
        sequelize.queryInterface.createTable(SEEDS, MODEL_MAP)
        .then(resolveEmpty);

    if (forceSync) {
      sequelize.query(`DELETE from ${SEEDS}`)
        .then(resolveEmpty)
        .catch(createSeeds);

      return;
    }

    sequelize.query(`SELECT name FROM ${SEEDS}`).then(seeds => {
      const names = seeds[0].map(s => s.name);
      resolve(names);
    })
    .catch(createSeeds);
  });

const isRelationshipDependent = {
  ONE_TO_ONE: (rel, seed) => rel.references === seed.name,
  ONE_TO_MANY: (rel, seed) => rel.references === seed.name,
  MANY_TO_ONE: (rel, seed) => rel.model === seed.name,
  MANY_TO_MANY: (rel, seed) => rel.model === seed.name || rel.references === seed.name
}

const depdendentName = {
  ONE_TO_ONE: rel => rel.model,
  ONE_TO_MANY: rel => rel.model,
  MANY_TO_ONE: rel => rel.references,
  MANY_TO_MANY: rel => manyToManyTableName(rel)
}

const sortByDependency = (toRun, db) => {

  // map everything out
  const map = {};
  _.forEach(toRun, seed => {
    map[seed.name] = seed;
    seed.dependents = _.filter(db.relationships, rel => isRelationshipDependent[rel.type](rel, seed));
  });

  // count logic
  const count = seed =>
    seed.dependents.length + _.sumBy(seed.dependents, r => {
      const dependent = map[depdendentName[r.type](r)];
      return dependent ? count(dependent) : 0;
    });

  // assign the count
  _.forEach(toRun, seed => {
    seed.sortOffset = count(seed);
  });

  // sort
  return _.reverse(
    _.sortBy(toRun, s => s.sortOffset)
  );
};

const plantSeeds = (sequelize, seedModel, models, db, seedsHistory) => {
  // determine which seeds to run
  const toRun = _.reject(db.seeds, seed => seedsHistory.includes(seed.name));

  if (_.isEmpty(toRun)) {
    log(NO_SEEDS);
    return Promise.resolve();
  }

  const sorted = sortByDependency(toRun, db);
  const tasks = sorted.map(seed => () => {
    log(`Running seed ${seed.name}`);

    const model = models[seed.name];
    if (!model) {
      logWarning(`No schema model found to match seed data '${seed.name}'`);
      return Promise.resolve();
    }

    return model.bulkCreate(seed.seeds)
      .then(() => resetAutoIncrement(sequelize, model))
      .then(() => seedModel.create({name: seed.name}))
      .catch(err => {
        log(`Seed ${seed.name} Failed:`);
        logError(err);

        throw err;
      });
    } // eslint-disable-line
  );

  return executeSeries(tasks)
    .then(() => {
      log(SEEDS_RUN);
    });
};

export const runSeeds = (sequelize, models, db, forceSync) => {
  const seedModel = sequelize.define('seed', MODEL_MAP);

  return getSeedHistory(sequelize, forceSync)
    .then(seedsHistory =>
      plantSeeds(sequelize, seedModel, models, db, seedsHistory)
    );
};

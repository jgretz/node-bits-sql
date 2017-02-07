import _ from 'lodash';
import Sequelize from 'sequelize';
import { log, logWarning, logError, executeSeries } from 'node-bits';

const SEEDS = 'seeds';
const MODEL_MAP = {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  createdAt: { type: Sequelize.DATE },
  updatedAt: { type: Sequelize.DATE },
  name: { type: Sequelize.STRING },
};

const NO_SEEDS = 'Database ready ... No seeds to run.';
const SEEDS_RUN = 'Database ready ... Seeds planted.';

const getSeedHistory = (sequelize) => {
  return new Promise((resolve) => {
    sequelize.query(`SELECT name FROM ${SEEDS}`)
      .then((seeds) => {
        const names = seeds[0].map(s => s.name);
        resolve(names);
      })
      .catch(() => {
        sequelize.queryInterface.createTable(SEEDS, MODEL_MAP)
        .then(() => resolve([]));
      });
    });
};

const plantSeeds = (sequelize, seedModel, models, seeds, seedsHistory, forceSync) => {
  // determine which seeds to run (need to run all every time if forceSync is on)
  const toRun = forceSync ? seeds : _.reject(seeds, (seed) => seedsHistory.includes(seed.name));

  if (_.isEmpty(toRun)) {
    log(NO_SEEDS);
    return Promise.resolve();
  }

  const tasks = toRun.map(seed => () => {
    log(`Running seed ${seed.name}`);

    const model = models[seed.name];
    if (!model) {
      logWarning(`No schema model found to match seed data '${seed.name}'`);
      return Promise.resolve();
    }

    return model.bulkCreate(seed.seeds)
      .then(() => seedModel.create({ name: seed.name }))
      .catch((err) => {
        log(`Seed ${seed.name} Failed:`);
        logError(err);

        throw err;
      });
    }
  );

  return executeSeries(tasks)
    .then(() => { log(SEEDS_RUN); });
};

export const runSeeds = (sequelize, models, seeds, forceSync) => {
  const seedModel = sequelize.define('seed', MODEL_MAP);

  return getSeedHistory(sequelize)
    .then((seedsHistory) => {
      return plantSeeds(sequelize, seedModel, models, seeds, seedsHistory, forceSync);
    });
};

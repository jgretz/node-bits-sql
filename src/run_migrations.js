import _ from 'lodash';
import Sequelize from 'sequelize';
import semver from 'semver';
import { log, logError, executeSeries } from 'node-bits';

const MIGRATIONS = 'migrations';
const MODEL_MAP = {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  createdAt: { type: Sequelize.DATE },
  updatedAt: { type: Sequelize.DATE },
  version: { type: Sequelize.STRING },
  assumedOnCreation: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }
};

const NO_MIGRATIONS = 'Database ready ... No migrations to run.';
const MIGRATIONS_RUN = 'Database ready ... Migrations complete.';

const getMigrationHistory = (sequelize) => {
  return new Promise((resolve, reject) => {
    sequelize.query(`SELECT version FROM ${MIGRATIONS}`)
      .then((migrations) => {
        const versions = migrations[0].map(m => m.version);
        resolve(versions);
      })
      .catch(() => reject());
    });
};

const createMigrationHistory = (sequelize, model, migrations) => {
  // create an entry for each of the migrations to date, so we don't run them in the future
  const seeds = migrations.map(migration =>
    () => model.create({ version: migration.version, assumedOnCreation: true })
  );

  return executeSeries([
    () => sequelize.queryInterface.createTable(MIGRATIONS, MODEL_MAP),
    ...seeds,
  ]);
};

const applyMigrations = (sequelize, model, migrations, migrationHistory) => {
  // determine which migrations to run
  const toRun = _.reject(migrations, (migration) => migrationHistory.includes(migration.version));

  if (_.isEmpty(toRun)) {
    log(NO_MIGRATIONS);
    return Promise.resolve();
  }

  const tasks = toRun.map(migration => () => {
    log(`Running Migration ${migration.version}`);

    return migration.migration.up(sequelize.queryInterface, sequelize)
      .then(() => model.create({ version: migration.version }))
      .catch((err) => {
        log(`Migration ${migration.version} Failed:`);
        logError(err);

        throw err;
      });
    }
  );

  return executeSeries(tasks)
    .then(() => { log(MIGRATIONS_RUN); });
};

export const runMigrations = (sequelize, migrations) => {
  const model = sequelize.define('migration', MODEL_MAP);
  migrations.sort((a, b) => {
    return semver.gt(a.version, b.version) ? 1 : semver.lt(a.version, b.version) ? -1 : 0;
  });

  return new Promise((resolve) => {
    // see if we have a migrations record table, if not assume a new db
    getMigrationHistory(sequelize)
      .then((migrationHistory) => {
        // get this out of the promise chain, we don't want the catch to fire
        // if the migration fails
        setTimeout(() => {
          applyMigrations(sequelize, model, migrations, migrationHistory)
            .then(resolve)
            .catch(resolve);
        }, 0);
      })
      .catch(() => {
        // the table doesn't exist, so we assume this is a new db and the schema is the latest
        // with no need to run the migrations to this point
        createMigrationHistory(sequelize, model, migrations)
          .then(() => {
            log(NO_MIGRATIONS);
            resolve();
          })
          .catch(resolve);
      });
  });
};

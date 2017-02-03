import _ from 'lodash';
import Sequelize from 'sequelize';
import semver from 'semver';
import { log, logError } from 'node-bits';

const MIGRATION_HISTORY = 'migrationHistories';
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

const getMigrationHistory = (sequelize) => {
  return new Promise((resolve, reject) => {
    sequelize.query(`SELECT version FROM "${MIGRATION_HISTORY}"`)
      .then((migrations) => {
        const versions = migrations[0].map(m => m.version);
        resolve(versions);
      })
      .catch(() => reject());
    });
};

const createMigrationHistory = (sequelize, model, migrations) => {
  sequelize.queryInterface.createTable(MIGRATION_HISTORY, MODEL_MAP);

  // create an entry for each of the migrations to date, so we don't run them in the future
  _.forEach(migrations, migration => {
    model.create({ version: migration.version, assumedOnCreation: true });
  });
};

const applyMigrations = (sequelize, model, migrations, migrationHistory) => {
  // determine which migrations to run
  const toRun = _.reject(migrations, (migration) => migrationHistory.includes(migration.version));

  if (_.isEmpty(toRun)) {
    log('Database is up to date, no migrations to run');
    return;
  }

  const execute = (index) => {
    if (index >= toRun.length) {
      log('Migrations Complete');
      return;
    }

    const migration = toRun[index];

    log(`Running Migration ${migration.version}`);
    migration.migration.up(sequelize.queryInterface, sequelize)
      .then(() => {
        model.create({ version: migration.version })
          .then(() => { execute(index + 1); });
      })
      .catch((err) => {
        log(`Migration ${migration.version} Failed:`);
        logError(err);
      });
  };
  execute(0);
};

export const runMigrations = (sequelize, migrations) => {
  const model = sequelize.define(MIGRATION_HISTORY, MODEL_MAP);
  migrations.sort((a, b) => {
    return semver.gt(a.version, b.version) ? 1 : semver.lt(a.version, b.version) ? -1 : 0;
  });

  // see if we have a migrations record table, if not assume a new db
  getMigrationHistory(sequelize)
    .then((migrationHistory) => {
      applyMigrations(sequelize, model, migrations, migrationHistory);
    })
    .catch(() => {
      // the table doesn't exist, so we assume this is a new db and the schema is the latest
      // with no need to run the migrations to this point
      createMigrationHistory(sequelize, model, migrations);
    });



  // run the migrations
};

const column = 'id';

const resetPostgres = (sequelize, table) => {
  return sequelize.query(`select max(${column}) from ${table}`)
    .then((result) => {
      const max = result[0][0].max;
      return sequelize.query(`alter sequence ${table}_${column}_seq restart with ${max + 1}`);
    });
};

const resetMssql = (sequelize, table) => {
  return sequelize.query(`select max(${column}) from ${table}`)
    .then((result) => {
      const max = result[0][0].max;
      return sequelize.query(`DBCC CHECKIDENT ('[${table}]', RESEED, ${max + 1});`);
    });
};

const resetMySQL = (sequelize, table) => {
  return sequelize.query(`select max(${column}) from ${table}`)
    .then((result) => {
      const max = result[0][0].max;
      return sequelize.query(`alter table ${table} AUTO_INCREMENT = ${max + 1};`);
    });
};


const map = {
  mysql: resetMySQL,
  postgres: resetPostgres,
  mssql: resetMssql,
};

export const resetAutoIncrement = (sequelize, model) => {
  const logic = map[sequelize.getDialect()];
  return logic ? logic(sequelize, model.getTableName()) : Promise.resolve();
};

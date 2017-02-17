const select = (table, column) =>
  `select max(${column}) from ${table}`;

const selectPostgres = (table, column) =>
  `select max(${column}) from "${table}"`;

const resetPostgres = (table, column, max) =>
  `alter sequence "${table}_${column}_seq" restart with ${max + 1}`;

const resetMssql = (table, column, max) =>
  `DBCC CHECKIDENT ('[${table}]', RESEED, ${max + 1});`;

const resetMySQL = (sequelize, table) =>
  `alter table ${table} AUTO_INCREMENT = ${max + 1};`;

const map = {
  mysql: { select, reset: resetMySQL },
  postgres: { select: selectPostgres, reset: resetPostgres },
  mssql: { select, reset: resetMssql },
};

export const resetAutoIncrement = (sequelize, model) => {
  const sqlGen = map[sequelize.getDialect()];
  if (!sqlGen) {
    return Promise.resolve();
  }

  const table = model.getTableName();
  const column = 'id';

  const select = sqlGen.select(table, column);
  console.log(select);

  return sequelize.query(select)
    .then((result) => {
      const max = result[0][0].max;
      const reset = sqlGen.reset(table, column, max);
      console.log(reset);

      return sequelize.query(reset);
    });
};

import Sql from './database';

// compile
const compileConfiguration = (options = {}, bitsConfig) => {
  return {
    ...options,
    ...bitsConfig,
  };
};

export default (options) =>
({
  initializeDatabase: (bitsConfig) =>  {
    const config = compileConfiguration(options, bitsConfig);
    const database = new Sql(config);

    database.connect();

    return database;
  }
});

const { setLogger } = require('./lib/logger');

let updateSchema = false;
let migrateAll = false;

const migration = (conn, path, argv = [...process.argv], options = [], customLogger = undefined) => {
    if (customLogger) {
      setLogger(customLogger);
    }

    const { table } = require('./lib/config');
    const queryFunctions = require('./lib/query');
    const logger = require('./lib/logger')();

    const updateSchemaIndex = argv.indexOf("--update-schema");
    const migrateIndex = argv.indexOf("--migrate-all");

    if (updateSchemaIndex > -1) {
      updateSchema = true;
      argv.splice(updateSchemaIndex, 1);
    }

    if (migrateIndex > -1) {
      migrateAll = true;
      argv.splice(migrateIndex, 1);
    }

    if (options instanceof Array) {
      if (options.indexOf("--migrate-all") > -1) {
        migrateAll = true;
      }

      if (options.indexOf("--update-schema") > -1) {
        updateSchema = true;
      }
    }

    return queryFunctions.runQuery(conn, `CREATE TABLE IF NOT EXISTS \`${table}\` (\`timestamp\` varchar(254) NOT NULL UNIQUE)`)
      .then(() => handle(argv, conn, path))
      .catch(error => logger.error(error));
};

const handle = (argv, conn, path) => new Promise(async (resolve, reject) => {
  const coreFunctions = require('./lib/core-functions');
  const { migrationsTypes } = require('./lib/config');

  if (!(argv.length > 2 && argv.length <= 6)) {
    return resolve();
  }

  if ('add' === argv[2] && ('migration' === argv[3] || 'seed' === argv[3])) {
    coreFunctions.addMigration(argv, path);
    conn.end();
    return resolve();
  }
  else if ('up' === argv[2])
  {
    let count = 999999;
    if (argv.length > 3) {
      count = parseInt(argv[3]);
    }

    return coreFunctions[`upMigrations${migrateAll ? 'All' : ''}`](conn, count, path)
      .then(() => updateSchemaAndEnd(conn, path))
      .then(() => resolve())
      .catch(error => reject(error));
  }
  else if ('down' === argv[2])
  {
    let count = 1;
    if (argv.length > 3) {
      count = parseInt(argv[3]);
    }

    return coreFunctions.downMigrations(conn, count, path)
      .then(() => updateSchemaAndEnd(conn, path))
      .then(() => resolve())
      .catch(error => reject(error));
  }
  else if ('refresh' === argv[2])
  {
    return coreFunctions.downMigrations(conn, 999999, path)
      .then(() => coreFunctions.upMigrations(conn, 999999, path))
      .then(() => updateSchemaAndEnd(conn, path))
      .then(() => resolve())
      .catch(error => reject(error));
  }
  else if ('run' === argv[2] && migrationsTypes.indexOf(argv[4]) > -1)
  {
    coreFunctions.runMigrationDirectly(argv[3], argv[4], conn, path, async () => {
      await updateSchemaAndEnd(conn, path);
      return resolve();
    });
  }
  else if ('load-from-schema' === argv[2])
  {
    coreFunctions.createFromSchema(conn, path, () => {
      conn.end();
      return resolve();
    });
  }
  else {
    return reject(`command not found: ${argv.join(' ')}`);
  }
});

const updateSchemaAndEnd = (conn, path) => new Promise(resolve => {
  const coreFunctions = require('./lib/core-functions');

  if (updateSchema) {
    coreFunctions.updateSchema(conn, path, () => {
      conn.end();
      return resolve();
    });
  } else {
    conn.end();
    return resolve();
  }
});

module.exports = {
  init: migration,
}

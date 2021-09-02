const fs = require('fs');
const exec = require('child_process').exec;
const fileFunctions = require('./file');
const queryFunctions = require('./query');
const logger = require('./logger')();
const { table } = require('./config');

const addMigration = (argv, path) => {
  fileFunctions.validateFileName(argv[4]);

  const fileName = `${Date.now()}_${argv[4]}`;
  const filePath = `${path}/${fileName}.js`;

  const sqlJson = {
    up: '',
    down: '',
  };

  if (argv.length > 5) {
    sqlJson['up'] = argv[5];
  }

  const content = 'module.exports = ' + JSON.stringify(sqlJson, null, 4) + ';';
  fs.writeFileSync(filePath, content, 'utf-8');
  logger.info(`Added file ${fileName}`);
};

const upMigrations = (conn, maxCount, path) =>
  queryFunctions.runQuery(conn, `SELECT timestamp FROM ${table} ORDER BY timestamp DESC LIMIT 1`)
    .then(results => {
      const filePaths = [];
      let maxTimestamp = 0;

      if (results.length) {
        const [{ timestamp }] = results;
        maxTimestamp = timestamp;
      }

      const files = fileFunctions.readFolder(path);
      for (const file of files) {
        const timestampSplit = file.split('_', 1);
        if (timestampSplit.length) {
          const timestamp = parseInt(timestampSplit[0]);
          if (Number.isInteger(timestamp) && 13 === timestamp.toString().length && timestamp > maxTimestamp) {
            filePaths.push({ timestamp, filePath: file });
          }
        } else {
          throw new Error(`Invalid file ${file}`);
        }
      }

      const finalFilePaths = filePaths.sort((a, b) => (a.timestamp - b.timestamp)).slice(0, maxCount);
      return queryFunctions.executeQuery(conn, path, finalFilePaths, 'up');
    });


const upMigrationsAll = (conn, maxCount, path) =>
  queryFunctions.runQuery(conn, `SELECT timestamp FROM ${table}`)
    .then(results => {
      const filePaths = [];
      const timestamps = results.map(({ timestamp }) => parseInt(timestamp));

      const  files = fileFunctions.readFolder(path);
      for (const file of files) {
        const timestampSplit = file.split('_', 1);
        if (timestampSplit.length) {
          const timestamp = parseInt(timestampSplit[0]);
          if (Number.isInteger(timestamp) && 13 === timestamp.toString().length && !timestamps.includes(timestamp)) {
            filePaths.push({ timestamp, filePath: file});
          }
        } else {
          throw new Error(`Invalid file ${file}`);
        }
      }

      const finalFilePaths = filePaths.sort((a, b) => (a.timestamp - b.timestamp)).slice(0, maxCount);
      return queryFunctions.executeQuery(conn, path, finalFilePaths, 'up');
    });

const downMigrations = (conn, maxCount, path) =>
  queryFunctions.runQuery(conn, `SELECT timestamp FROM ${table} ORDER BY timestamp DESC LIMIT ${maxCount}`)
    .then(results => {
      const filePaths = [];

      if (!results.length) {
        return;
      }

      const tempTimestamps = results.map(({ timestamp }) => timestamp);

      const files = fileFunctions.readFolder(path);
      for (const file of files) {
        const [ timestamp ] = file.split('_', 1);
        if (tempTimestamps.indexOf(timestamp) > -1) {
          filePaths.push({ timestamp, filePath: file});
        }
      }

      const finalFilePaths = filePaths.sort((a, b) => (b.timestamp - a.timestamp)).slice(0, maxCount);
      return queryFunctions.executeQuery(conn, path, finalFilePaths, 'down');
    });

const runMigrationDirectly = (file, type, conn, path, cb) => {
  const query = require(`${path}/${file}`)[type];
  queryFunctions.runQuery(conn, query)
    .then(() => cb());
};

const updateSchema = (conn, path, cb) => {
  const { config: { connectionConfig } } = conn;
  const filePath = `${path}/schema.sql`;

  fs.unlink(filePath, () => {
    const cmd = ['mysqldump --no-data'];
    if (connectionConfig.host) {
      cmd.push(`-h ${connectionConfig.host}`);
    }

    if (connectionConfig.port) {
      cmd.push(`--port=${connectionConfig.port}`);
    }

    if (connectionConfig.user) {
      cmd.push(`--user=${connectionConfig.user}`);
    }

    if (connectionConfig.password) {
      cmd.push(`--password=${connectionConfig.password}`);
    }

    cmd.push(connectionConfig.database);

    exec(cmd.join(' '), (error, stdout) => {
      fs.writeFile(filePath, stdout, err => {
        if (err) {
          logger.error('Could not save schema file');
        }

        cb();
      });
    });
  });
};

const createFromSchema = (conn, path, cb) => {
  const { config: { connectionConfig } } = conn;
  const filePath = `${path}/schema.sql`;

  if (fs.existsSync(filePath)) {
    const cmd = ['mysql'];
    if (connectionConfig.host) {
      cmd.push(`-h ${connectionConfig.host}`);
    }

    if (connectionConfig.port) {
      cmd.push(`--port= ${connectionConfig.port}`);
    }

    if (connectionConfig.user) {
      cmd.push(`--user= ${connectionConfig.user}`);
    }

    if (connectionConfig.password) {
      cmd.push(`--password= ${connectionConfig.password}`);
    }

    cmd.push(connectionConfig.database);
    cmd.push(` < ${filePath}`);

    exec(cmd, (error) => {
      if (error) {
        logger.error(`Could not load from Schema: ${error}`);
        return cb();
      }

      const filePaths = [];
      fileFunctions.readFolder(path, files => {
        for (const file of files) {
          const timestampSplit = file.split('_', 1);
          const timestamp = parseInt(timestampSplit[0]);
          if (timestampSplit.length) {
            filePaths.push({ timestamp, filePath: file});
          } else {
            throw new Error(`Invalid file ${file}`);
          }
        }

        const finalFilePaths = filePaths.sort((a, b) => (a.timestamp - b.timestamp)).slice(0, 9999999);
        queryFunctions.executeQuery(conn, path, finalFilePaths, 'up', false)
          .then(() => cb);
      });
    });
  } else {
    logger.error(`Schema Missing: ${filePath}`);
    cb();
  }
};

module.exports = {
  addMigration,
  upMigrations,
  upMigrationsAll,
  downMigrations,
  runMigrationDirectly,
  updateSchema,
  createFromSchema,
};

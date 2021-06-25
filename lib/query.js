const logger = require('./logger')();
const { table } = require('./config');

const runQuery = (conn, query, run = true) => new Promise((resolve, reject) => {
  if (!run) {
    return resolve({});
  }

  conn.getConnection((error, connection) => {
    if (error) {
      return reject(error);
    }

    connection.query(query, (error, results) => {
      connection.release();

      if (error) {
        return reject(error);
      }

      return resolve(results);
    });
  });
})

const runQueryWithCallback = (query, conn) => new Promise(resolve => query(conn, () => resolve()));

const executeQuery = (conn, path, finalFilePaths, type, run = true) => new Promise(async (resolve, reject) => {
  if (!finalFilePaths.length) {
    logger.info(`No more ${type.toUpperCase()} migrations to run`);
    return resolve();
  }

  for (const { filePath } of finalFilePaths) {
    const queries = require(`${path}/${filePath}`);
    logger.info(`Run: ${run} Type: ${type.toUpperCase()}: ${queries[type]}`);

    const [timestampVal] = filePath.split('_', 1);

    try {
      if ('string' === typeof (queries[type])) {
        await runQuery(conn, queries[type], run);
      } else if ('function' === typeof (queries[type])) {
        logger.info(`${type.toUpperCase()} Function: "${queries[type].toString()}"`);
        await runQueryWithCallback(conn, queries[type], run);
      }

        await updateRecords(conn, type, table, timestampVal);
      } catch (error) {
        return reject(error);
      }
    }

  return resolve();
});

const updateRecords = (conn, type, table, timestampVal) => {
  let query = '';
  if ('up' === type) {
    query = `INSERT INTO ${table} (\`timestamp\`) VALUES ('${timestampVal}')`;
  } else if ('down' === type) {
    query = `DELETE FROM ${table} WHERE \`timestamp\` = '${timestampVal}'`;
  }

  return runQuery(conn, query);
};

module.exports = {
  runQuery,
  executeQuery,
  updateRecords,
};

var table = require('./config')['table'];
var fileFunctions  = require('./file');
var colors = require('colors');

function run_query(conn, query, cb, run) {
  if (run == null) {
    run = true;
  }

  if (run) {
    conn.getConnection(function(err, connection) {
      if (err) {
        throw err;
      }

      connection.query(query, function (error, results, fields) {
        connection.release();
        if (error) {
          throw error;
        }
        cb(results);
      });
    });
  } else {
    cb({});
  }
}

function execute_query(conn, path, final_file_paths, type, cb, run) {
  if (run == null) {
    run = true;
  }

  if (final_file_paths.length) {
    var file_name = final_file_paths.shift()['file_path'];
    var current_file_path = path + "/" + file_name;
    
    var queries = require(current_file_path);
    console.info(colors.green("Run: " + run + " Type: " + type.toUpperCase() + ": " +queries[type]));

    var timestamp_val = file_name.split("_", 1)[0];
    if (typeof(queries[type]) == 'string') {
      run_query(conn, queries[type], function (res) {
        updateRecords(conn, type, table, timestamp_val, function () {
          execute_query(conn, path, final_file_paths, type, cb, run);
        });
      }, run);
    } else if (typeof(queries[type]) == 'function') {
      console.info(`${type.toUpperCase()} Function: "${ queries[type].toString() }"`);

      queries[type](conn, function() {
        updateRecords(conn, type, table, timestamp_val, function () {
          execute_query(conn, path, final_file_paths, type, cb);
        });
      });
    }

  } else {
    console.info(colors.blue("No more " + type.toUpperCase() + " migrations to run"));
    cb();
  }
}

function updateRecords(conn, type, table, timestamp_val, cb) {
  var query = '';
  if (type == 'up') {
    query = "INSERT INTO " + table + " (`timestamp`) VALUES ('" + timestamp_val + "')";
  } else if (type == 'down') {
    query = "DELETE FROM " + table + " WHERE `timestamp` = '" + timestamp_val + "'"
  }

  run_query(conn, query, function (res) {
    cb();
  });
}

module.exports = {
  run_query: run_query,
  execute_query: execute_query,
  updateRecords: updateRecords
};

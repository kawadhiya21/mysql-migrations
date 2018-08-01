var table = require('./config')['table'];
var fileFunctions  = require('./file');

function run_query(conn, query, cb) {
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
}

function execute_query(conn, path, final_file_paths, type, cb) {
  if (final_file_paths.length) {
    var file_name = final_file_paths.shift()['file_path'];
    var current_file_path = path + "/" + file_name;

    var queries = require(current_file_path);

    if (typeof(queries[type]) == 'string') {
      run_query(conn, queries[type], function (res) {
        updateRecords(conn, type, table, file_name, function () {
          execute_query(conn, path, final_file_paths, type, cb);
        });
      });
    } else if (typeof(queries[type]) == 'function') {
      queries[type](conn, function() {
        updateRecords(conn, type, table, file_name, function () {
          execute_query(conn, path, final_file_paths, type, cb);
        });
      });
    }

  } else {
    cb();
  }
}

function updateRecords(conn, type, table, file_name, cb) {
  var query = '';
  var timestamp_val = file_name.split("_", 1)[0];
  var migration = file_name.split("_", 1)[1];

  if (type == 'up') {
    query = "INSERT INTO " + table + " (`timestamp`) VALUES ('" + timestamp_val + "','" + migration + "')";
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

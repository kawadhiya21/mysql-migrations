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
    fileFunctions.readFile(current_file_path, function (content) {
      console.log("Executing " + file_name);
      var json_dump = JSON.parse(content);
      if (typeof(json_dump[type]) == 'string') {
        run_query(conn, json_dump[type], function (res) {
          var timestamp_val = file_name.split("_", 1)[0];
          updateRecords(conn, type, table, timestamp_val, function () {
            execute_query(conn, path, final_file_paths, type, cb);
          });
        });
      } else if (typeof(json_dump[type]) == 'function') {
        json_dump[type](conn, function() {
          updateRecords(conn, type, table, timestamp_val, function () {
            execute_query(conn, path, final_file_paths, type, cb);
          });
        });
      }
    });
  } else {
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

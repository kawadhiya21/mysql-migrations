var fs = require("fs");
var table = 'mysql_migrations_347ertt3e';

function migration(conn, path) {
  run_query(conn, "CREATE TABLE IF NOT EXISTS `" + table + "` (`timestamp` varchar(254) NOT NULL UNIQUE)", function (res) {
    handle(process.argv, conn, path);
  });
}

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

function validate_file_name(file_name) {
  var patt = /^[0-9a-zA-Z-_]+$/;
  if (!patt.test(file_name)) {
    throw new Error("File name can contain alphabets, numbers, hyphen or underscore");
  }
}

function readFolder(path, cb) {
  fs.readdir(path, function (err, files) {
    if (err) {
      throw err;
    }

    cb(files);
  });
}

function readFile(path, cb) {
  fs.readFile(path, function (err, data) {
    if (err) {
      throw err;
    }

    cb(data);
  });
}

function add_migration(argv, path) {
  validate_file_name(argv[4]);
  readFolder(path, function (files) {
    var file_name = Date.now() + "_" + argv[4];
    var file_path = path + '/' + file_name;

    var sql_json = {
      up   : '',
      down : ''
    };

    if (argv.length > 5) {
      sql_json['up'] = argv[5];
    }

    fs.writeFile(file_path, JSON.stringify(sql_json, null, 4), 'utf-8', function (err) {
      if (err) {
        throw err;
      }
    });
  });
}

function up_migrations(conn, max_count, path) {
  run_query(conn, "SELECT timestamp FROM " + table + " ORDER BY timestamp DESC LIMIT 1", function (results) {
    var file_paths = [];
    var max_timestamp = 0;
    if (results.length) {
      max_timestamp = results[0].timestamp;
    }

    readFolder(path, function (files) {
      files.forEach(function (file) {
        var timestamp_split = file.split("_", 1);
        if (timestamp_split.length) {
          var timestamp = parseInt(timestamp_split[0]);
          if (Number.isInteger(timestamp) && timestamp.toString().length == 13 && timestamp > max_timestamp) {
            file_paths.push({ timestamp : timestamp, file_path : file});
          }
        } else {
          throw new Error('Invalid file ' + file);
        }
      });

      var final_file_paths = file_paths.sort(function(a, b) { return (a.timestamp - b.timestamp)}).slice(0, max_count);
      execute_query(conn, path, final_file_paths, 'up');
    });
  });
}

function down_migrations(conn, max_count, path) {
  run_query(conn, "SELECT timestamp FROM " + table + " ORDER BY timestamp DESC LIMIT " + max_count, function (results) {
    var file_paths = [];
    var max_timestamp = 0;
    if (results.length) {
      var temp_timestamps = results.map(function(ele) {
        return ele.timestamp;
      });

      readFolder(path, function (files) {
        files.forEach(function (file) {
          var timestamp = file.split("_", 1)[0];
          if (temp_timestamps.indexOf(timestamp) > -1) {
            file_paths.push({ timestamp : timestamp, file_path : file});
          }
        });

        var final_file_paths = file_paths.sort(function(a, b) { return (b.timestamp - a.timestamp)}).slice(0, max_count);
        execute_query(conn, path, final_file_paths, 'down');
      });
    }
  });
}


function execute_query(conn, path, final_file_paths, type) {
  if (final_file_paths.length) {
    var file_name = final_file_paths.shift()['file_path'];
    var current_file_path = path + "/" + file_name;
    readFile(current_file_path, function (content) {
      var json_dump = JSON.parse(content);
      run_query(conn, json_dump[type], function (res) {
        var timestamp_val = file_name.split("_", 1)[0];
        console.log("Executing " + file_name);
        if (type == 'up') {
          run_query(conn, "INSERT INTO " + table + " (`timestamp`) VALUES ('" + timestamp_val + "')", function (res) {
            execute_query(conn, path, final_file_paths, type);
          });
        } else if (type == 'down') {
          run_query(conn, "DELETE FROM " + table + " WHERE `timestamp` = '" + timestamp_val + "'", function (res) {
            execute_query(conn, path, final_file_paths, type);
          });
        }
      });
    });
  } else {
    conn.end();
  }
}

function handle(argv, conn, path) {
  if (argv.length > 2 && argv.length <= 6) {
    if (argv[2] == 'add' && argv[3] == 'migration') {
      add_migration(argv, path);
    }

    if (argv[2] == 'up') {
      var count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else {
        count = 999999;
      }
      up_migrations(conn, count, path);
    }

    if (argv[2] == 'down') {
      var count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else count = 1;
      down_migrations(conn, count, path);
    }
  }
}

module.exports = {
  init: migration
}

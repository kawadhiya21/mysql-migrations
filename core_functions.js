var fs = require("fs");

var fileFunctions  = require('./file');
var queryFunctions = require('./query');
var colors = require('colors');
var exec = require('child_process').exec;
var table = require('./config')['table'];

function add_migration(argv, path, cb) {
  fileFunctions.validate_file_name(argv[4]);
  fileFunctions.readFolder(path, function (files) {
    var file_name = Date.now() + "_" + argv[4];
    var file_path = path + '/' + file_name + '.js';

    var sql_json = {
      up   : '',
      down : ''
    };

    if (argv.length > 5) {
      sql_json['up'] = argv[5];
    }

    var content = 'module.exports = ' + JSON.stringify(sql_json, null, 4);
    fs.writeFile(file_path, content, 'utf-8', function (err) {
      if (err) {
        throw err;
      }

      console.log("Added file " + file_name);
      cb();
    });
  });
}

function up_migrations(conn, max_count, path, cb) {
  queryFunctions.run_query(conn, "SELECT timestamp FROM " + table + " ORDER BY timestamp DESC LIMIT 1", function (results) {
    var file_paths = [];
    var max_timestamp = 0;
    if (results.length) {
      max_timestamp = results[0].timestamp;
    }

    fileFunctions.readFolder(path, function (files) {
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
      queryFunctions.execute_query(conn, path, final_file_paths, 'up', cb);
    });
  });
}

function up_migrations_all(conn, max_count, path, cb) {
  queryFunctions.run_query(conn, "SELECT timestamp FROM " + table, function (results) {
    var file_paths = [];
    var timestamps = results.map(r => parseInt(r.timestamp));

    fileFunctions.readFolder(path, function (files) {
      files.forEach(function (file) {
        var timestamp_split = file.split("_", 1);
        if (timestamp_split.length) {
          var timestamp = parseInt(timestamp_split[0]);
          if (Number.isInteger(timestamp) && timestamp.toString().length == 13 && !timestamps.includes(timestamp)) {
            file_paths.push({ timestamp : timestamp, file_path : file});
          }
        } else {
          throw new Error('Invalid file ' + file);
        }
      });

      var final_file_paths = file_paths.sort(function(a, b) { return (a.timestamp - b.timestamp)}).slice(0, max_count);
      queryFunctions.execute_query(conn, path, final_file_paths, 'up', cb);
    });
  });
}

function down_migrations(conn, max_count, path, cb) {
  queryFunctions.run_query(conn, "SELECT timestamp FROM " + table + " ORDER BY timestamp DESC LIMIT " + max_count, function (results) {
    var file_paths = [];
    var max_timestamp = 0;
    if (results.length) {
      var temp_timestamps = results.map(function(ele) {
        return ele.timestamp;
      });

      fileFunctions.readFolder(path, function (files) {
        files.forEach(function (file) {
          var timestamp = file.split("_", 1)[0];
          if (temp_timestamps.indexOf(timestamp) > -1) {
            file_paths.push({ timestamp : timestamp, file_path : file});
          }
        });

        var final_file_paths = file_paths.sort(function(a, b) { return (b.timestamp - a.timestamp)}).slice(0, max_count);
        queryFunctions.execute_query(conn, path, final_file_paths, 'down', cb);
      });
    }
  });
}

function run_migration_directly(file, type, conn, path, cb) {
  var current_file_path = path + "/" + file;
  var query = require(current_file_path)[type];
  queryFunctions.run_query(conn, query, cb);
}

function update_schema(conn, path, cb) {
  var conn_config = conn.config.connectionConfig;
  var filePath = path + '/' + 'schema.sql';
  fs.unlink(filePath, function() {
    var cmd = "mysqldump --no-data ";
    if (conn_config.host) {
      cmd = cmd + " -h " + conn_config.host;
    }

    if (conn_config.port) {
      cmd = cmd + " --port=" + conn_config.port;
    }

    if (conn_config.user) {
      cmd = cmd + " --user=" + conn_config.user;
    }

    if (conn_config.password) {
      cmd = cmd + " --password=" + conn_config.password;
    }

    cmd = cmd + " " + conn_config.database;
    exec(cmd, function(error, stdout, stderr) {
      fs.writeFile(filePath, stdout, function(err) {
        if (err) {
          console.log(colors.red("Could not save schema file"));
        }
        cb();
      });
    });
  });
}

function createFromSchema(conn, path, cb) {
  var conn_config = conn.config.connectionConfig;
  var filePath = path + '/' + 'schema.sql';
  if (fs.existsSync(filePath)) {
    var cmd = "mysql ";
    if (conn_config.host) {
      cmd = cmd + " -h " + conn_config.host;
    }

    if (conn_config.port) {
      cmd = cmd + " --port=" + conn_config.port;
    }

    if (conn_config.user) {
      cmd = cmd + " --user=" + conn_config.user;
    }

    if (conn_config.password) {
      cmd = cmd + " --password=" + conn_config.password;
    }

    cmd = cmd + " " + conn_config.database;
    cmd = cmd + " < " + filePath;
    exec(cmd, function(error, stdout, stderr) {
      if (error) {
        console.log(colors.red("Could not load from Schema: " + error));
        cb();
      } else {
        var file_paths = [];
        fileFunctions.readFolder(path, function (files) {
          files.forEach(function (file) {
            var timestamp_split = file.split("_", 1);
            var timestamp = parseInt(timestamp_split[0]);
            if (timestamp_split.length) {
              file_paths.push({ timestamp : timestamp, file_path : file});
            } else {
              throw new Error('Invalid file ' + file);
            }
          });

          var final_file_paths = file_paths.sort(function(a, b) { return (a.timestamp - b.timestamp)}).slice(0, 9999999);
          queryFunctions.execute_query(conn, path, final_file_paths, 'up', cb, false);
        });
      }
    });
  } else {
    console.log(colors.red("Schema Missing: " + filePath));
    cb();
  }
}

module.exports = {
  add_migration: add_migration,
  up_migrations: up_migrations,
  up_migrations_all: up_migrations_all,
  down_migrations: down_migrations,
  run_migration_directly: run_migration_directly,
  update_schema: update_schema,
  createFromSchema: createFromSchema
};

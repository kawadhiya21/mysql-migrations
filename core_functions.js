var fs = require("fs");

var fileFunctions  = require('./file');
var queryFunctions = require('./query');
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

function up_migrations(conn, max_count, path, cb, file_names) {
  fileFunctions.readFolder(path, function (files) {
    var file_paths = {};
    var timestamps = [];
    files.forEach(function(file) {
      if (file_names && file_names.indexOf(file) == -1) {
        return;
      }
      var timestamp_split = file.split("_", 1);
      if (timestamp_split.length) {
        var timestamp = timestamp_split[0];
        timestamps.push(timestamp);
        file_paths[timestamp] = {
          file_path: file,
          timestamp: parseInt(timestamp)
        };
      } else {
        throw new Error('Invalid file ' + file);
      }
    });

    if (!timestamps.length) {
      console.log('No files for migrations.');
      return cb();
    }

    timestamps = timestamps.join(',');
    var query = "SELECT timestamp FROM " + table + " WHERE timestamp IN (" + timestamps + ") ORDER BY timestamp DESC";

    queryFunctions.run_query(conn, query, function (results) {
      if (results.length) {
        results.forEach(function(result) {
          delete file_paths[result.timestamp];
        });
      }

      var final_file_paths = [];
      for (var timestamp in file_paths) {
        final_file_paths.push(file_paths[timestamp]);
      }
      final_file_paths = final_file_paths.sort(function(a, b) { return (a.timestamp - b.timestamp)}).slice(0, max_count);
      queryFunctions.execute_query(conn, path, final_file_paths, 'up', cb);
    });
  });
}

function down_migrations(conn, max_count, path, cb, file_names) {
  var limit = max_count ? " LIMIT " + max_count : '';
  queryFunctions.run_query(conn, "SELECT timestamp FROM " + table + " ORDER BY timestamp DESC " + limit, function (results) {
    var file_paths = [];
    if (results.length) {
      var temp_timestamps = results.map(function(ele) {
        return ele.timestamp;
      });

      fileFunctions.readFolder(path, function (files) {
        files.forEach(function (file) {
          if (file_names && file_names.indexOf(file) == -1) {
            return;
          }
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
  var migrations_function = type == 'up' ? up_migrations : down_migrations;
  migrations_function(conn, undefined, path, cb, [file]);
}

module.exports = {
  add_migration: add_migration,
  up_migrations: up_migrations,
  down_migrations: down_migrations,
  run_migration_directly: run_migration_directly
};

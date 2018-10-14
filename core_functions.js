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

function extractTimeStampFromFileName(file_path) {
  // file path example "3213123213_filename.sql"
  return file_path.split("_", 1).shift();
}

function complete_migrations(conn, path, cb) {
  const query = `SELECT CONCAT(timestamp, '_', migration) AS \`migration\` FROM ${table} ORDER BY timestamp ASC`;

  return queryFunctions
      .run_query(conn, query, function (results) {
          const migrations = results.map((el) => el.migration);

          fileFunctions.readFolder(path, function (files) {
            files = files
                .filter((el) => migrations.indexOf(el) < 0)
                .map((file_path) => ({timestamp: extractTimeStampFromFileName(file_path), file_path}))
                .sort((a, b) => (a.timestamp - b.timestamp));
            queryFunctions.execute_query(conn, path, files, 'up', cb);
      });
  });
}

function test_migrations(conn, path, cb) {
  const query = `SELECT CONCAT(timestamp, '_', migration) AS \`migration\` FROM ${table} ORDER BY timestamp ASC`;

  return queryFunctions
      .run_query(conn, query, function (results) {
          const migrations = results.map((el) => el.migration);

          fileFunctions.readFolder(path, function (files) {
              files = files
                .filter((el) => migrations.indexOf(el) < 0)
                .map((file_path) => ({timestamp: extractTimeStampFromFileName(file_path), file_path}))
                .sort((a, b) => (a.timestamp - b.timestamp));
              if (files.length > 0 ) {
                  console.log('Migrations ready to run:');
                  files.map((file) => console.log(file.file_path));
              } else {
                  console.log('All migratoins applied. Nothing to do here!');
              }
              process.exit(0);
      });
  });
}

function run_migration_directly(file_path, type, conn, path, cb) {
  var final_file_paths = [{timestamp: extractTimeStampFromFileName(file_path), file_path}];
  queryFunctions.execute_query(conn, path, final_file_paths, type, cb);
}

module.exports = {
  add_migration: add_migration,
  up_migrations: up_migrations,
  down_migrations: down_migrations,
  complete_migrations: complete_migrations,
  test_migrations: test_migrations,
  run_migration_directly: run_migration_directly
};

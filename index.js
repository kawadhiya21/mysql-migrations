var fs = require("fs");

var coreFunctions  = require('./core_functions');
var queryFunctions  = require('./query');

var config = require('./config');
var table = config['table'];
var migrations_types = config['migrations_types'];

function migration(conn, path) {
  queryFunctions.run_query(conn, "CREATE TABLE IF NOT EXISTS `" + table + "` (`timestamp` varchar(254) NOT NULL UNIQUE)", function (res) {
    handle(process.argv, conn, path);
  });
}

function handle(argv, conn, path) {
  if (argv.length > 2 && argv.length <= 6) {
    if (argv[2] == 'add' && (argv[3] == 'migration' || argv[3] == 'seed')) {
      coreFunctions.add_migration(argv, path, function () {
        conn.end();
      });
    } else if (argv[2] == 'up') {
      var count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else {
        count = 999999;
      }
      coreFunctions.up_migrations(conn, count, path, function () {
        conn.end();
      });
    } else if (argv[2] == 'down') {
      var count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else count = 1;
      coreFunctions.down_migrations(conn, count, path, function () {
        conn.end();
      });
    } else if (argv[2] == 'refresh') {
      coreFunctions.down_migrations(conn, 999999, path, function () {
        coreFunctions.up_migrations(conn, 999999, path, function () {
          conn.end();
        });
      });
    } else if (argv[2] == 'run' && migrations_types.indexOf(argv[4]) > -1) {
      coreFunctions.run_migration_directly(argv[3], argv[4], conn, path, function () {
        conn.end();
      });
    } else {
      throw new Error('command not found : ' + argv.join(" "));
    }
  }
}

module.exports = {
  init: migration
}

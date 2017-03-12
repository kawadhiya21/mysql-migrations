var fs = require("fs");

var coreFunctions  = require('./core_functions');
var queryFunctions  = require('./query');

var table = require('./config')['table'];

function migration(conn, path) {
  queryFunctions.run_query(conn, "CREATE TABLE IF NOT EXISTS `" + table + "` (`timestamp` varchar(254) NOT NULL UNIQUE)", function (res) {
    handle(process.argv, conn, path);
  });
}

function handle(argv, conn, path) {
  if (argv.length > 2 && argv.length <= 6) {
    if (argv[2] == 'add' && (argv[3] == 'migration' && argv[3] == 'seed')) {
      coreFunctions.add_migration(argv, path, function () {
        conn.end();
      });
    }

    if (argv[2] == 'up') {
      var count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else {
        count = 999999;
      }
      coreFunctions.up_migrations(conn, count, path, function () {
        conn.end();
      });
    }

    if (argv[2] == 'down') {
      var count = null;
      if (argv.length > 3) {
        count = parseInt(argv[3]);
      } else count = 1;
      coreFunctions.down_migrations(conn, count, path, function () {
        conn.end();
      });
    }
  }
}

module.exports = {
  init: migration
}

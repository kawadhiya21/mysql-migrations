var mysql = require('./mysql');
var fs = require('fs');

function deleteFolderRecursive(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if (!fs.lstatSync(curPath).isDirectory()) {
        fs.unlinkSync(curPath);
      }
    });
  } else {
    fs.mkdirSync(path);
  }
}

module.exports = function(cb) {
  mysql.getConnection(function(err, connection) {
    if (err) {
      throw err;
    }

    connection.query("DROP TABLE IF EXISTS user1", function (error) {
      if (error) throw error;
      connection.query("DROP TABLE IF EXISTS user2", function (error) {
        if (error) throw error;
        connection.query("DROP TABLE IF EXISTS user3", function (error) {
          if (error) throw error;
          connection.query("DROP TABLE IF EXISTS user4", function (error) {
            if (error) throw error;
            connection.query("DROP TABLE IF EXISTS user5", function (error) {
              if (error) throw error;
              deleteFolderRecursive(__dirname + '/migrations');
              cb();
            });
          });
        });
      });
    });
  });
}

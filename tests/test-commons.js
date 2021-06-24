const mysql = require('./mysql');
const fs = require('fs');

const deleteFolderRecursive = path => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      const curPath = `${path}/${file}`;
      if (!fs.lstatSync(curPath).isDirectory()) {
        fs.unlinkSync(curPath);
      }
    });
  } else {
    fs.mkdirSync(path);
  }
};

module.exports = cb => {
  mysql.getConnection((err, connection) => {
    if (err) {
      throw err;
    }

    connection.query('DROP TABLE IF EXISTS user1', error => {
      if (error) throw error;
      connection.query('DROP TABLE IF EXISTS user2', error => {
        if (error) throw error;
        connection.query('DROP TABLE IF EXISTS user3', error => {
          if (error) throw error;
          connection.query('DROP TABLE IF EXISTS user4', error => {
            if (error) throw error;
            connection.query('DROP TABLE IF EXISTS user5', error => {
              if (error) throw error;
              deleteFolderRecursive(__dirname + '/migrations');
              cb();
            });
          });
        });
      });
    });
  });
};

const assert = require('assert');

const queryFunctions = require('../lib/query');
const testCommons = require('./test-commons');
const mysql = require('./mysql');

describe('query.js', () => {
  before (done => {
    testCommons(done);
  });

  context('updateRecords', () => {
    const timestamp = Date.now();
    const table = 'user1';

    it('should insert into table when up', done => {
      mysql.getConnection((err, connection) => {
        connection.query(`CREATE TABLE \`${table}\` (timestamp VARCHAR(255))`, error => {
          if (error) {
            throw error;
          }

          queryFunctions.updateRecords(mysql, 'up', table, timestamp, () => {
            connection.query(`SELECT * FROM \`${table}\` WHERE timestamp='${timestamp}'`, (err, res) => {
              if (err) {
                throw err;
              }

              assert.ok(res.length);
              done();
            });
          });
        });
      });
    });

    it('should delete from table when down', function (done) {
      queryFunctions.updateRecords(mysql, 'down', table, timestamp, () => {
        mysql.getConnection((err, connection) => {
          connection.query(`SELECT * FROM \`${table}\` WHERE timestamp='${timestamp}'`, (err, res) => {
            if (err) {
              throw err;
            }

            assert.ok(!res.length);
            done();
          });
        });
      });
    });
  });
});

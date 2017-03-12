var chai = require('chai');

var queryFunctions = require('../query');
var testCommons = require('./test_commons');
var mysql = require('./mysql');
var assert = require('assert');

var should = chai.should();

describe('query.js', function() {
  before(function (done) {
    testCommons(done);
  });

  context('updateRecords', function () {
    var timestamp = Date.now();
    var table = 'user1';
    it('should insert into table when up', function (done) {
      mysql.getConnection(function (err, connection) {
        connection.query('CREATE TABLE `'+table+'` (timestamp VARCHAR(255))', function (error, results) {
          if (error) {
            throw error;
          }

          queryFunctions.updateRecords(mysql, 'up', table, timestamp, function () {
            connection.query('SELECT * FROM `'+table+'` WHERE timestamp="'+timestamp+'"', function(err, res) {
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
      queryFunctions.updateRecords(mysql, 'down', table, timestamp, function () {
        mysql.getConnection(function (err, connection) {
          connection.query('SELECT * FROM `'+table+'` WHERE timestamp="'+timestamp+'"', function(err, res) {
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

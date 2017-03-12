var chai = require('chai');
var fs = require('fs');

var coreFunctions = require('../core_functions');
var testCommons = require('./test_commons');
var mysql = require('./mysql');
var assert = require('assert');

var should = chai.should();

describe('core_functions.js', function() {
  before(function (done) {
    testCommons(done);
  });

  context('add_migration', function () {
    it('should add migration', function (done) {
      var commands = ['node', 'migration', 'add', 'migration', 'create_user2'];
      var path = __dirname +  '/migrations';
      coreFunctions.add_migration(commands, path, function () {
        fs.readdirSync(path).forEach(function(file,index){
          assert.ok(file.indexOf('create_user2'));
        });

        done();
      });
    });
  });
});

const fs = require('fs');
const assert = require('assert');

const coreFunctions = require('../lib/core-functions');
const testCommons = require('./test-commons');

describe('core-functions.js', () => {
  before(done => {
    testCommons(done);
  });

  context('addMigration', () => {
    it('should add migration', done => {
      const commands = ['node', 'migration', 'add', 'migration', 'create_user2'];
      const path = __dirname + '/migrations';

      coreFunctions.addMigration(commands, path, () => {
        fs.readdirSync(path).forEach((file,index) => {
          assert.ok(file.indexOf('create_user2'));
        });

        done();
      });
    });
  });
});

const fs = require('fs');

const validateFileName = fileName => {
  const pattern = /^[0-9a-zA-Z-_]+$/;
  if (!pattern.test(fileName)) {
    throw new Error('File name can contain alphabets, numbers, hyphen or underscore');
  }
};

const readFolder = path => {
  const files = fs.readdirSync(path);
  const schemaPath = files.indexOf('schema.sql');
  if (schemaPath > -1) {
    files.splice(schemaPath, 1);
  }

  return files;
};

const readFile = path => fs.readFileSync(path);

module.exports = {
  validateFileName,
  readFolder,
  readFile,
};

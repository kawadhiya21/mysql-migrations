var fs = require("fs");

function validate_file_name(file_name) {
  var patt = /^[0-9a-zA-Z-_]+$/;
  if (!patt.test(file_name)) {
    throw new Error("File name can contain alphabets, numbers, hyphen or underscore");
  }
}

function readFolder(path, cb) {
  fs.readdir(path, function (err, files) {
    if (err) {
      throw err;
    }

    var schemaPath = files.indexOf("schema.sql");
    if (schemaPath > -1) {
      files.splice(schemaPath, 1);
    }
    cb(files);
  });
}

function readFile(path, cb) {
  fs.readFile(path, function (err, data) {
    if (err) {
      throw err;
    }

    cb(data);
  });
}

module.exports = {
  validate_file_name: validate_file_name,
  readFolder: readFolder,
  readFile: readFile
};

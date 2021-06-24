const colors = require('colors');

let logger = {
  info: msg => console.info(colors.green(msg)),
  error: msg => console.error(colors.red(msg)),
};

module.exports = () => logger;
module.exports.setLogger = customLogger => logger = customLogger;

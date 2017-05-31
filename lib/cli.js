
let wep = require('./index');

module.exports = function (program, confFilePath) {

  require(confFilePath);

  wep.run(program.args[0]);
};

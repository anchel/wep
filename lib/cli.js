
let fs = require('fs');
let path = require('path');
let wep = require('./index');

module.exports = function (program = {}) {

  let pwd = process.cwd();

  let confFileName = program.conf;
  let confFilePath = path.resolve(pwd, confFileName);
  let basename = path.basename(confFilePath);

  if (!fs.existsSync(confFilePath)) {
    console.log('can not find config file: ' + basename);
    process.exit(0);
  }

  require(confFilePath)(wep);

  let taskName = 'default';
  if (program && program.args && program.args.length > 0) {
    taskName = program.args[0];
  }

  wep.run(taskName);
};

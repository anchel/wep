
let co = require('co');
let inquirer = require('inquirer');
let chalk = require('chalk');
module.exports = function (wep) {

  function env (config) {
    return co(function* () {
      if (!config.env) {
        throw new Error('no env on wepConfig')
      }
      let answers = yield inquirer.prompt([{
        type: 'rawlist',
        name: 'selenv',
        message: '请选择要部署的环境',
        choices: Object.keys(config.env),
        pageSize: 100,
      }]);
      // console.log('answers', answers);
      let envcfg = config.env[answers.selenv];
      if (!envcfg) {
        throw new Error('选择的环境配置不存在: ' + answers.selenv);
      }
      config.envcfg = envcfg;

      let answers2 = yield inquirer.prompt([{
        type: 'confirm',
        name: 'ayok',
        default: false,
        message: '您选择的环境是：' + chalk.green(answers.selenv) + '，确定要部署吗？',
      }]);

      if (!answers2.ayok) {
        console.log('you cancel the publish');
        process.exit(0)
      }
      return answers2.ayok;
    });
  }
  wep.registerTask('env', 'select env', env)

};
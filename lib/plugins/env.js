
let co = require('co');
let inquirer = require('inquirer');
module.exports = function (wep) {

  function env (config) {
    return co(function* () {
      if (!config.env) {
        throw new Error('no env on wepConfig')
      }
      let answers = yield inquirer.prompt([{
        type: 'list',
        name: 'selenv',
        message: '请选择要部署的环境',
        choices: Object.keys(config.env)
      }]);
      // console.log('answers', answers);
      let envcfg = config.env[answers.selenv];
      if (!envcfg) {
        throw new Error('选择的环境配置不存在: ' + answers.selenv);
      }
      // console.log('envcfg', envcfg);
      config.envcfg = envcfg;

      let answers2 = yield inquirer.prompt([{
        type: 'confirm',
        name: 'ayok',
        default: false,
        message: '您选择的环境是：' + answers.selenv + '，确定要部署吗？',
      }]);

      return answers2.ayok;
    });
  }
  wep.registerTask('env', 'select env', env)

};
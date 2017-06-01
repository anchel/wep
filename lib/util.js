
module.exports = {

  getCfgVal: function (config, tplStr) {
    if (!tplStr) {
      return tplStr;
    }

    let fn = new Function('envcfg', 'return `' + tplStr + '`;');
    try {
      return fn(config.envcfg);
    } catch (err) {
      if (!config.envcfg) {
        console.log('错误原因可能是您没有选择部署环境，但任务却依赖了环境配置。或者是您的环境配置数据结构不正确。')
      }
      throw err;
    }
  },

}

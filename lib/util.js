
module.exports = {

  getCfgVal: function (cfg = {}, tplStr) {
    if (!tplStr) {
      return tplStr;
    }
    let fn = new Function('envcfg', 'return `' + tplStr + '`;');
    return fn(cfg);
  },

}

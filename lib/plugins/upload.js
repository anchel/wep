
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let co = require('co');
let request = require('request');
let util = require('../util');

let pwd = process.cwd();

module.exports = function (wep) {

  function upload (wepConfig) {
    return co(function* () {
      if (!wepConfig.upload) {
        throw new Error('no upload on wepConfig')
      }
      let defaultOptions = wepConfig.upload.options || {};
      let files = wepConfig.upload.files || [];
      let rets = [];
      for (let item of files) {
        item.options = item.options || {};
        item.options = _.merge({}, defaultOptions, item.options);

        item.src = item.src || [];
        item.src = item.src.map(function (name) {
          return util.getCfgVal(wepConfig.envcfg, name)
        });

        for (let name of item.src) {
          let srcItem = {name: name, options: _.merge({}, item.options)};
          rets.push(yield uploadSingle(srcItem))
        }
      }

      return rets;
    })
  }

  function uploadSingle (srcItem) {
    return new Promise(function (resolve, reject) {
      let filepath = path.resolve(pwd, srcItem.name);
      if (!fs.existsSync(filepath)) {
        reject(new Error('文件不存在 ' + srcItem.name));
        return;
      }
      let query = getParams(srcItem);
      let uploadOpt = {
        method: 'post',
        qs: query,
        formData: {
          filedatas: fs.createReadStream(filepath)
        },
        timeout: 30000,
      };
      _.merge(uploadOpt, srcItem.options);
      console.log('uploading ' + path.basename(filepath) + ' ...');
      console.log('uploadOpt: ', uploadOpt);

      request(uploadOpt, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          let info = body;
          if (typeof(info) === 'string') {
            info = JSON.parse(body);
          }

          if (info.ret_code === 200) {
            resolve(info.cdn_url)
          } else {
            reject(new Error(info.err_msg))
          }
        } else {
          reject(new Error(error ? error.message : '上传发生错误'))
        }
      })
    });
  }

  function getParams (srcItem) {
    let filepath = path.resolve(pwd, srcItem.name);
    let extName = path.extname(filepath);
    let stats = fs.statSync(filepath);

    let query = {
      filename: path.basename(filepath, extName),
      filetype: extName,
      filesize: stats.size,
    };
    if (query.filetype && query.filetype.indexOf('.') === 0) {
      query.filetype = query.filetype.slice(1)
    }
    return query;
  }
  wep.registerTask('upload', 'upload files', upload)
};

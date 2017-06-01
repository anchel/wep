
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let co = require('co');
let glob = require('glob');
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
          if (typeof(name) === 'string') {
            return {
              file: util.getCfgVal(wepConfig, name)
            }
          } else {
            if (name.pattern) {
              name.pattern = util.getCfgVal(wepConfig, name.pattern);
            }
            return name;
          }
        });
        item.dest = util.getCfgVal(wepConfig, item.dest);

        for (let srcItem of item.src) {
          if (srcItem.file) {
            let subItem = {file: srcItem.file, dest: item.dest, options: _.merge({}, item.options)};
            rets.push(yield uploadSingle(subItem))
          } else {
            let files = glob.sync(srcItem.pattern);
            if (files) {
              for (let f of files) {
                let subItem = {file: f, dest: item.dest, options: _.merge({}, item.options)};
                rets.push(yield uploadSingle(subItem))
              }
            }
          }

        }
      }

      return rets;
    })
  }

  function uploadSingle (srcItem) {
    return new Promise(function (resolve, reject) {
      let filepath = path.resolve(pwd, srcItem.file);
      if (!fs.existsSync(filepath)) {
        reject(new Error('文件不存在 ' + filepath));
        return;
      }
      let query = getParams(srcItem);
      let uploadOpt = {
        method: 'post',
        qs: query,
        // body: fs.createReadStream(filepath),
        formData: {
          files: fs.createReadStream(filepath)
        },
        headers: {
          // 'Content-Type': 'application/octet-stream'
        },
        timeout: 60000,
      };
      _.merge(uploadOpt, srcItem.options);
      if (!uploadOpt.qs.user) {
        uploadOpt.qs.user = getUserName();
      }

      console.log('uploading ' + path.basename(filepath) + ' ...');
      // console.log('uploadOpt: ', uploadOpt);

      let req = request(uploadOpt, function (error, response, body) {
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
      });

    });
  }

  function getParams (srcItem) {
    let filepath = path.resolve(pwd, srcItem.file);
    let extName = path.extname(filepath);
    let stats = fs.statSync(filepath);

    let query = {
      filepath: srcItem.dest,
      filename: path.basename(filepath, extName),
      filetype: extName,
      filesize: stats.size,
      // slicesize: stats.size,
      // offset: 0,
    };
    if (query.filetype && query.filetype.indexOf('.') === 0) {
      query.filetype = query.filetype.slice(1)
    }
    return query;
  }

  function getUserName() {
    let env = process.env;
    let userName = env.SUDO_USER
      || env.LOGNAME
      || env.USER
      || env.LNAME
      || env.USERNAME;
    if (!userName) {
      throw new Error('User name could not be found in environment varible.');
    }
    return userName
  }

  wep.registerTask('upload', 'upload files', upload)
};

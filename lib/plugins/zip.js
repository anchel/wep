let co = require('co');
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let rimraf = require('rimraf');
let archiver = require('archiver');
let mkdirp = require('mkdirp-promise');
let util = require('../util');

let pwd = process.cwd();

module.exports = function (wep) {

  function zip(wepConfig) {
    return co(function*() {
      if (!wepConfig.zip) {
        throw new Error('no zip on wepConfig')
      }
      let zips = [];
      if (!Array.isArray(wepConfig.zip.files)) {
        let arr = [];
        _.each(wepConfig.zip.files, function (item, key) {
          let _o = {name: key};
          Object.assign(_o, item);
          arr.push(_o)
        });
        zips = arr;
      } else {
        zips = _.merge([], wepConfig.zip.files)
      }

      let rets = [];
      for (let zipItem of zips) {
        let singleRet = yield singleZip(zipItem, wepConfig);
        rets.push(singleRet)
      }
      return rets;
    })
  }

  /**
   * @param {*} zipItem
   * {
   *  name: '',
   *  src: [{
   *    file: '',
   *    name: '',
   *    pattern: '',
   *    cwd: ''
   *  }]
   * }
   * @param {*} wepConfig
   *
   */
  function singleZip(zipItem, wepConfig) {
    return co(function* () {
      let destzippath = yield getDestZipPath(zipItem);
      zipItem.destzippath = destzippath;
      if (fs.existsSync(destzippath)) {
        rimraf.sync(destzippath);
      }

      console.log(`zipping ${zipItem.name}.zip ...`);
      return new Promise(function (resolve, reject) {
        if (!Array.isArray(zipItem.src)) {
          reject(new Error('src should be an array'));
          return;
        }

        let archive = archiver('zip', {
          store: true // Sets the compression method to STORE.
        });

        let fileOutput = fs.createWriteStream(destzippath);

        fileOutput.on('close', function () {
          resolve(zipItem);
        });

        fileOutput.on('error', function (err) {
          reject(err);
        });

        zipItem.src.forEach(function (srcItem) {
          srcItem.file = util.getCfgVal(wepConfig, srcItem.file);
          srcItem.name = util.getCfgVal(wepConfig, srcItem.name);
          srcItem.pattern = util.getCfgVal(wepConfig, srcItem.pattern);
          srcItem.cwd = util.getCfgVal(wepConfig, srcItem.cwd);
          if (srcItem.file) {
            // append a file from stream
            let filePath = path.resolve(pwd, srcItem.file)
            let filename = srcItem.name || path.basename(filePath);

            archive.append(fs.createReadStream(filePath), {name: filename});

          } else if (srcItem.pattern) {
            let options = {};
            if (srcItem.cwd) {
              Object.assign(options, {cwd: srcItem.cwd});
            }
            // append files from a glob pattern
            archive.glob(srcItem.pattern, options);
          }
        });
        archive.pipe(fileOutput);

        archive.on('error', function (err) {
          reject(err)
        });
        archive.finalize();
      })
    });
  }

  function getDestZipPath(zipItem) {
    return co(function* () {
      let destdir = path.resolve(pwd, zipItem.dest);
      if (!fs.existsSync(destdir)) {
        yield mkdirp(destdir);
      }
      return path.join(destdir, zipItem.name + '.zip')
    })
  }

  wep.registerTask('zip', 'zip files', zip)
};


let fs = require('fs');
let path = require('path');
let co = require('co');
let resolveCwd = require('resolve-cwd');
let resolve = require('resolve');
let chalk = require('chalk');

let wep = module.exports = {};

wep.cli = require('./cli');

let lastConfig = null;
let taskMap = null;


wep.init = function (cfg) {
  lastConfig = cfg;
};

wep.loadNpmTask = function (moduleId) {
  let module = resolveCwd.silent(moduleId);
  if (!module) {
    console.log('can not find module ' + moduleId)
  }
  require(module)(wep);
};

wep.loadDefaultTask = function (taskid) {
  let tasks = [taskid];
  if (Array.isArray(taskid)) {
    tasks = taskid;
  }
  for (let task of tasks) {
    let p = path.resolve(__dirname, 'plugins', task + '.js');
    if (!fs.existsSync(p)) {
      throw new Error('no default task ' + task)
    }
    require(p)(wep)
  }
};

wep.registerTask = function (taskName, desc, handler) {
  if (!taskMap) {
    taskMap = {}
  }
  let task;
  let deps = [];
  if (Array.isArray(desc)) {
    deps = desc;
    task = new Task(taskName, '', null, deps)
  } else {
    task = new Task(taskName, desc, handler, deps)
  }
  taskMap[taskName] = task;
};

function Task (name, desc, handler, deps = []) {
  this.name = name;
  this.desc = desc;
  this.handler = handler;
  this.deps = deps;
}

Task.prototype.run = function (config) {
  let that = this;
  // console.log(`------ task ${that.name} run start ------`);
  return co(function* () {
    let ret = true;
    if (that.deps && that.deps.length > 0) {
      for (let depTask of that.deps) {
        if (!taskMap[depTask]) {
          throw new Error('can not find task: ' + depTask)
        }
        ret = yield taskMap[depTask].run(config);
      }
    }
    if (ret && that.handler) {
      ret = yield that.handler.call(that, config);
    }
    return ret;
  });
};

wep.run = function (taskName) {

  function gg () {
    lastConfig = null;
    taskMap = null;
  }

  co(function* () {
    let config = lastConfig || {};
    // config.envcfg = {};

    if (!taskMap) {
      console.log('you need to use wep.registerTask first');
      return;
    }
    if (!taskMap[taskName]) {
      console.log('can not find task: ' + taskName);
      return;
    }

    let runTask = taskMap[taskName];

    yield runTask.run(config);
  }).then(function (ret) {
    gg();
    console.log('publish ' + chalk.green('successful'))
  }).catch(function (err) {
    console.log('err', err);
    gg();
    console.log('publish ' + chalk.red('fail'))
  });


};


let fs = require('fs');
let path = require('path');
let resolveCwd = require('resolve-cwd');

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
    let p = path.resolve(__dirname, 'plugins', task);
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
  let deps;
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
  return co(function* () {
    let ret = true;
    if (that.deps && that.deps.length > 0) {
      for (let depTask of that.deps) {
        ret = yield depTask.run(config);
        if (!ret) {
          break;
        }
      }
    }
    if (ret && that.handler) {
      ret = yield that.handler.call(that, config);
    }
    return ret;
  });
};

wep.run = function (taskName) {

  let config = lastConfig || {};

  if (taskMap[taskName]) {
    console.log('can not find task: ' + taskName);
  }

  let runTask = taskMap[taskName];

  function gg () {
    lastConfig = null;
    taskMap = null;
  }

  co(function* () {
    yield runTask.run(config);
  }).then(function () {
    gg();
  }).catch(function () {
    gg();
  });


};

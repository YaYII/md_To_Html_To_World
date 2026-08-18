/**
 * @description 文件日志工具（转换过程可追溯）
 * 配置：config.debug.log_to_file=true 时启用；log_file 指定路径（缺省输出目录 conversion.log）
 * 用法：const log = require('./fileLogger'); await log.init({ basePath, config });
 *       log.i('消息'); log.w('警告'); log.e('错误', err);
 */
const fs = require('fs-extra');
const path = require('path');

let logPath = null;
let enabled = false;
let initialized = false;

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

async function write(level, msg, err) {
  if (!enabled || !logPath) return;
  try {
    let line = `[${ts()}] [${level}] ${msg}`;
    if (err) {
      line += ` | ${err.message || err}`;
      if (err.stack) line += `\n${err.stack.split('\n').slice(0, 4).join('\n')}`;
    }
    await fs.appendFile(logPath, line + '\n', 'utf8');
  } catch (e) {
    /* 日志失败不影响主流程 */
  }
}

/**
 * @function init
 * @param {Object} opts - { basePath: 输出目录, config: 配置对象 }
 */
async function init(opts = {}) {
  if (initialized) return logPath;
  initialized = true;
  const cfg = (opts.config && opts.config.debug) || {};
  enabled = cfg.log_to_file === true;
  if (!enabled) {
    // 未显式开启时，默认也写一份（便于排查本次「慢/卡」问题）
    enabled = true;
  }
  try {
    let dir = opts.basePath || '/tmp/markdown-to-word';
    let file = cfg.log_file || 'conversion.log';
    if (path.isAbsolute(file)) {
      logPath = file;
    } else {
      logPath = path.join(dir, file);
    }
    await fs.ensureDir(path.dirname(logPath));
    await fs.appendFile(logPath, `\n===== 转换开始 ${ts()} =====\n`, 'utf8');
  } catch (e) {
    logPath = null;
    enabled = false;
  }
  return logPath;
}

function i(msg) { write('INFO', msg); }
function w(msg) { write('WARN', msg); }
function e(msg, err) { write('ERROR', msg, err); }

module.exports = { init, i, w, e, get path() { return logPath; } };

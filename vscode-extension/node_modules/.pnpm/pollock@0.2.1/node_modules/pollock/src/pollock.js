/*
 * Copyright (C) 2018 Alasdair Mercer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

/**
 * Assigns an abstract method with a given name to the specified <code>type</code> based on the <code>options</code>
 * provided which, when called, will result in an error containing a suitable error being thrown. The aim is to quickly
 * highlight to consumers of your API that they an abstract method has not been implemented in a fail-fast fashion.
 *
 * If the <code>typeName</code> option is specified, it will be used instead of the name of <code>type</code>. If
 * <code>type</code> has no name, for whatever reason, <code>"&lt;anonymous&gt;"</code> will be used.
 *
 * If the <code>static</code> option is enabled, the created abstract method will assigned directly to <code>type</code>
 * instead of <code>type.prototype</code>.
 *
 * While the default behaviour is synchronous in design, as it simply throws the error, it may be necessary to support
 * reporting the error using asynchronous patterns. The <code>callback</code> option can be specifed to indicate the
 * expected index of the callback function to be passed to the abstract method. This index can be negative if it should
 * be applied from the end of the argument list instead of the beginning. Once identified, the abstract method will
 * invoke the callback function with the error as the first argument. Alternatively, the <code>promise</code> option can
 * be enabled for the method to return a rejected ECMAScript 2015 <code>Promise</code> instead.
 *
 * Regardless of which asynchronous pattern is used, both options only indicate a preference. If no callback function is
 * found at the specified index or if the current environment does not support promises, the abstract method will fall
 * back on the default behaviour of simply throwing the error.
 *
 * @param {Function} type - the constructor function to which the abstract method is to be assigned
 * @param {string} methodName - the name of the abstract method to be assigned
 * @param {pollock~Options} [options] - the options to be used
 * @return {void}
 * @public
 */
function pollock(type, methodName, options) {
  if (!options) {
    options = {};
  }

  function abstractMethod() {
    var typeName = options.typeName || type.name || '<anonymous>';
    var separator = options.static ? '.' : '#';
    var error = new Error(typeName + separator + methodName + ' abstract method is not implemented');
    var callback;

    if (options.callback != null && (callback = findCallback(arguments, options.callback))) {
      return callback(error);
    } else if (options.promise && typeof Promise !== 'undefined') {
      return Promise.reject(error);
    }

    throw error;
  }

  if (options.static) {
    type[methodName] = abstractMethod;
  } else {
    type.prototype[methodName] = abstractMethod;
  }
}

function findCallback(args, index) {
  if (index < 0) {
    index = args.length + index;
  }
  index = Math.max(index, 0);

  var callback = args[index];

  return typeof callback === 'function' ? callback : null;
}

module.exports = pollock;

/**
 * The options that can be passed to <code>pollock</code>.
 *
 * @typedef {Object} pollock~Options
 * @property {number} [callback] - The index of callback function argument passed to the abstract method to which the
 * error should be passed as the first argument, where possible. If negative, the index will be taken from the end of
 * the arguments.
 * @property {boolean} [promise] - <code>true</code> to prefer that the abstract method to return a rejected ES2015
 * <code>Promise</code>, where supported, instead of throwing the error; otherwise <code>false</code>.
 * @property {boolean} [static] - <code>true</code> for the abstract method to be applied directly to <code>type</code>;
 * <code>false</code> for it to be applied to <code>type.prototype</code>.
 * @property {string} [typeName] - The name to be used in the error message instead of the one derived from
 * <code>type</code>.
 */

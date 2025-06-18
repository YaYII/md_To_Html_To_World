(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define('pollock', factory) :
  (global.pollock = factory());
}(this, (function () { 'use strict';

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

  var pollock_1 = pollock;

  var pollock$1 = pollock_1;

  return pollock$1;

})));
//# sourceMappingURL=pollock.js.map

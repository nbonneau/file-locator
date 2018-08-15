/**
 * @author Nicolas BONNEAU
 * @description A parser function to parser reference into an object
 * @version 1.0.0
 */

const objectPath = require('object-path');
const extend = require('extend');

// Export or define or add to global
;
(function(global, factory) {

    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        global.fileLoader = factory();

}(this, function factory() {
    'use strict';

    return function(opts) {

        const Loader = function(opts) {

            const options = {

            }

            extend(true, options, opts);

            this._opts = options;
        }

        return new Loader(opts);
    }
}));
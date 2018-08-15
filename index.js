/**
 * @author Nicolas BONNEAU
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const extend = require('extend');
const RefParser = require('ref-parser');

// Export or define or add to global
;
(function(global, factory) {

    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
        global.fileLocator = factory();

}(this, function factory() {
    'use strict';

    return function(opts) {

        const FileLocator = function(opts) {
            // Default Loader options
            const options = {
                env: undefined,
                data: {},
                importsKey: 'imports',
                refParserOptions: {}
            };
            // Extend default Loader option with opts argument
            extend(true, options, opts);
            // Set _opts Loader property
            this._opts = options;
            // Set _loaders Loader property
            this._loaders = [];
            // Set reference parser
            this._refParser = RefParser(this._opts.refParserOptions);

            // Add JSON extension loader
            this.addExtensionLoader("json", function(filepath, callback) {
                callback(null, require(filepath));
            });
            // Add JS extension loader
            this.addExtensionLoader("js", function(filepath, callback) {
                callback(null, require(filepath));
            });
        }

        FileLocator.ExtensionLoader = ExtensionLoader;

        /**
         * Load file
         * 
         * @param {string}       filepath  File path to load
         * @param {object|null}  opts      Load options, extended with Loader options
         * @param {boolean|null} noParsing If true, no parse reference key
         */
        FileLocator.prototype.load = function(filepath, opts, noParsing) {
            // Override opts argument
            opts = opts ||  {};
            // Extend opts argument with Loader options
            extend(true, opts, this._opts);

            // Get file extension
            const ext = getExtension(filepath);
            // Get file dirname
            const dir = getDirname(filepath);

            // Get extension loader
            const extensionLoader = this.getExtensionLoader(ext);
            if (!extensionLoader) {
                // No extension loader found
                return Promise.reject(new Error(`No extension loader for "${ext}" extension for file "${filepath}". Use addExtensionLoader(ext, loaderCallback) to add the extension loader.`));
            }

            // Load data from files
            return extensionLoader.load(filepath, opts.env)
                .then((data) => {
                    // Extend data with opts data
                    extend(true, data, opts.data);
                    // If imports is defined and is an array
                    if (Array.isArray(data[opts.importsKey])) {
                        // Parse imports
                        this._refParser.parse(data, opts.importsKey);
                        data[opts.importsKey] = formatImportPaths(data[opts.importsKey], dir);
                        // Load imports 
                        return this.loadImports(data, opts)
                    }
                    return Promise.resolve(data);
                })
                .then((data) => {
                    // Parse data
                    if (!noParsing) {
                        this._refParser.parse(data);
                    }
                    return data;
                })
        }

        /**
         * Load imports inside data argument
         * 
         * @param {object} data
         * @param {object} opts
         */
        FileLocator.prototype.loadImports = function(data, opts) {
            // Override opts argument
            opts = opts ||  {};
            // Extend opts argument with Loader options
            extend(true, opts, this._opts);

            if (Array.isArray(data[opts.importsKey])) {
                return Promise.all(data[opts.importsKey].map((filepath) => this.load(filepath, opts, true))).then((results) => {
                    // Add data to results to first position to become target extend
                    results.unshift(data);
                    // Add true to results to set recursive extend
                    results.unshift(true);
                    // Call extend
                    extend.apply(extend, results);

                    return data;
                });
            }
            return Promise.resolve(data);
        }

        /**
         * Add an extension file loader
         * 
         * @param {string|ExtensionLoader} extension      File extension or ExtensionLoader instance
         * @param {function|null}          loaderCallback Callback loader
         * @return 
         */
        FileLocator.prototype.addExtensionLoader = function(extension, loaderCallback) {
            // Add loader
            // If extension is not an ExtensionLoader instance, create new ExtensionLoader instance
            this._loaders.push(extension instanceof ExtensionLoader ? extension : new ExtensionLoader(extension, loaderCallback));
            return this;
        }

        /**
         * Return the loader for the given extension
         * 
         * @param {string} extension Extension to get loader
         * @return
         */
        FileLocator.prototype.getExtensionLoader = function(extension) {
            // Get the loader extension
            return this._loaders.find((extLoader) => extLoader.extension === overrideExtension(extension));
        }

        return new FileLocator(opts);
    }
}));

// ----------------------------------------------------------------------------------------

const ExtensionLoader = function ExtensionLoader(extension, loaderCallback) {
    // Validate arguments
    if (typeof extension !== "string" || typeof loaderCallback !== "function") {
        throw new Error('Invalid ExtensionLoader constructor argument(s)');
    }
    this.extension = overrideExtension(extension);
    this.loaderCallback = loaderCallback;
}

ExtensionLoader.prototype.load = function(filepath, env) {

    const loadPromises = [this.callLoader(filepath)];
    const envFilepath = getEnvFilepath(filepath, env);

    if (env && fs.existsSync(envFilepath)) {
        loadPromises.push(this.callLoader(envFilepath));
    }

    // Load file using extension loader
    return Promise.all(loadPromises)
        .then((results) => {

            const data = results[0];
            const envData = results[1];

            if (envData) {
                extend(true, data, envData);
            }

            return data;
        });
}

ExtensionLoader.prototype.callLoader = function(filepath) {
    return new Promise((resolve, reject) => {
        return this.loaderCallback(filepath, (err, data) => err ? reject(err) : resolve(data));
    });
}

// ----------------------------------------------------------------------------------------

function getExtension(filepath) {
    return path.extname(filepath);
}

function getDirname(filepath) {
    return path.dirname(filepath);
}

function overrideExtension(extension) {
    return new RegExp(/^\./, 'g').test(extension) ? extension : '.' + extension;
}

function formatImportPaths(imports, dir) {
    return imports.map((file) => {
        if (path.isAbsolute(file)) {
            return file;
        }
        return path.join(dir, file);
    });
}

function getEnvFilepath(filepath, env) {

    if (!env) {
        return filepath;
    }

    const extension = path.extname(filepath);
    const basename = path.basename(filepath, extension);
    const directory = path.dirname(filepath);

    return path.join(directory, basename + '_' + env + extension);
}
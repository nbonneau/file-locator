var expect = require('chai').expect;

var FileLoader = require('../index');

describe('main', function() {
    it('should make some test', function(done) {

        process.env.NODE_ENV = 'test';

        var fileLoader = FileLoader({
            env: process.env.NODE_ENV,
            refParserOptions: {
                // Will NOT be merged with file data
                // Only use on parsing reference key
                global: {
                    env: process.env
                }
            },
            // Will be merged with file data
            data: {
                rootDir: __dirname
            }
        });

        fileLoader.load(__dirname + '/data/config.json').then((data) => {
            console.log(data);
            done();
        });
    });
});
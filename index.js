#!/usr/bin/env node

var npm = require('npm'),
    semver = require('semver'),
    fs = require('fs'),
    log = require('npmlog');

log.heading = 'publish';

try {
    var pgk = JSON.parse(fs.readFileSync('./package.json'));
} catch(e) {
    log.error('publish can only be performed from the root of npm modules (where the package.json resides)');
    process.exit(1);
}

var localVersion = pgk.version;
if (localVersion == null) {
    log.error('You have not defined a version in your npm module, check your package.json');
    process.exit(1);
}

npm.load( {}, function (err) {
    if (err) {
        log.error(err);
    } else {
        npm.commands.view([pgk.name, 'version'], true, function(err, message) {
            if (err) {
                if (err.code === 'E404') {
                    log.warn('You have not published yet your first version of this module: publish will do nothing\n' +
                        'You must publish manually the first release of your module');
                    process.exit(0);
                } else {
                    log.error(err);
                    process.exit(1);
                }
            }

            for(var remoteVersion in message) break;

            if (semver.eq(remoteVersion, localVersion)) {
                log.info('Your local version is the same as your published version: publish will do nothing');
                process.exit(0);
            } else if (semver.gt(remoteVersion, localVersion)) {
                log.warn('Your local version is smaller than your published version: publish will do nothing');
                process.exit(0);
            } else {
                npm.commands.publish([], false, function(err, message) {
                    if (err) {
                        log.error(err);
                        process.exit(1);
                    }

                    log.info('published ok');
                    process.exit(0);
                });
            }
        });
    }
});
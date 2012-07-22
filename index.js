#!/usr/bin/env node

var npm = require('npm'),
    semver = require('semver'),
    fs = require('fs'),
    log = require('npmlog'),
    nopt = require("nopt"),
    onVersions = ['on-major', 'on-minor', 'on-patch', 'on-build'],
    knownOpts = { 'on-major':Boolean, 'on-minor': Boolean, 'on-patch': Boolean, 'on-build': Boolean },
    shorthands = { "?": ["--help"], "v": ["--version"]},
    parsedIndexLookup = { 'on-major':1, 'on-minor':2, 'on-patch':3, 'on-build':4 },
    options = nopt(knownOpts, shorthands);

if (options.version) {
    console.log(require("./package.json").version)
    process.exit(0)
}

if (options.help) {
    console.log(function () {/*

     Usage:
     publish <options>

     Publishes the current module if the version of the local module is higher than the one in the registry.

     Options:

     --on-major  Publishes on major version changes.
     --on-minor  Publishes on minor version changes.
     --on-patch  Publishes on patch version changes.
     --on-build  Publishes on build version changes.
     --version   Print the version of publish.
     --help      Print this help.

     Please report bugs!  https://github.com/cmanzana/node-publish/issues

     */
    }.toString().split(/\n/).slice(1, -2).join("\n"));
    process.exit(0);
}

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
                remoteVersion = semver.parse(remoteVersion);
                localVersion = semver.parse(localVersion);

                var shouldPublish = true;

                for (var i = 0; i < onVersions.length; i++) {
                    var onVersion = onVersions[i];
                    var parsedIndex = parsedIndexLookup[onVersion];

                    if (options[onVersion]) {
                        if (remoteVersion[parsedIndex] === localVersion[parsedIndex]) {
                            shouldPublish = false;
                        } else {
                            shouldPublish = true;
                            break;
                        }
                    }
                }
                if (shouldPublish) {
                     npm.commands.publish([], false, function(err, message) {
                         if (err) {
                             log.error(err);
                             process.exit(1);
                         }

                        log.info('published ok');
                        process.exit(0);
                     });
                } else {
                    log.info('Your local version does not satisfy your --on-[major|minor|patch|build] options');
                }

            }
        });
    }
});
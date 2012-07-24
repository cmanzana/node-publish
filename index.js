var npm = require('npm'),
    semver = require('semver'),
    fs = require('fs');

var onVersions = ['on-major', 'on-minor', 'on-patch', 'on-build'],
    parsedIndexLookup = { 'on-major':1, 'on-minor':2, 'on-patch':3, 'on-build':4 };

log = require('npmlog');
log.heading = 'publish';

exports.start = function(callback) {
    npm.load({}, function (err) {
        callback(err);
    });
}

function localPackage(callback) {
    try {
        callback(null, JSON.parse(fs.readFileSync('./package.json')));
    } catch (err) {
        callback(err);
    }
}
exports.localPackage = localPackage;

function remoteVersion(localPackage, callback) {
    npm.commands.view([localPackage.name, 'version'], true, function (err, message) {
        if (err) {
            if (err.code === 'E404') {
                callback('You have not published yet your first version of this module: publish will do nothing\n' +
                         'You must publish manually the first release of your module');
            } else {
                callback(err);
            }
        } else {
            for (var remoteVersion in message) break;
            callback(null, remoteVersion);
        }
    });
}
exports.remoteVersion = remoteVersion;

exports.publish = function(options, callback) {
    localPackage(function(err, pkg) {
        if (err) {
            callback('publish can only be performed from the root of npm modules (where the package.json resides)');
        } else {
            var localVersion = pkg.version;
            if (localVersion == null) {
                callback('you have not defined a version in your npm module, check your package.json');
            }

            remoteVersion(pkg, function(err, remoteVersion) {
                if (shouldPublish(options, localVersion, remoteVersion)) {
                    npmPublish(callback);
                }
            });
        }
    })
}

function npmPublish(callback) {
    npm.commands.publish([], false, function (err, message) {
        if (err) {
            callback(err);
        } else {
            log.info('published ok');
            callback();
        }
    });

}

function shouldPublish(options, localVersion, remoteVersion) {
    options = options || {};

    log.info('Local version: ' + localVersion);
    log.info('Published version: ' + remoteVersion);
    if (semver.eq(remoteVersion, localVersion)) {
        log.info('Your local version is the same as your published version: publish will do nothing');
        return false;
    } else if (semver.gt(remoteVersion, localVersion)) {
        log.warn('Your local version is smaller than your published version: publish will do nothing');
        return false;
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

        if (!shouldPublish) {
            log.info('Your local version does not satisfy your --on-[major|minor|patch|build] options');
        }

        return shouldPublish;
    }
}
exports.shouldPublish = shouldPublish;
const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

const __projectDir = path.join(__dirname, '__projects');
const __tracksDir = path.join(__dirname, '__projects', 'tracks');
const __synthDir = path.join(__dirname, '__projects', 'synthesizers');

/**
 * Check file/folder path
 * @param {string} dirPath Directory/file path
 * @param {boolean} isFolder If true, check for folder only and create if not exists.
 */
function _checkAndCreateFile(dirPath, isFolder) {
    let stat;
    try {
        stat = fs.statSync(dirPath);
    } catch (err) {
        // Create a folder
        if (isFolder)
            fs.mkdirSync(dirPath);
        return null;
    }
    if (isFolder && !stat.isDirectory()) {
        throw new Error('Non folder already exists on this path');
    }
    return stat;
}

function _listFilesFromDir(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, function (err, files) {
            if (err) {
                return reject(err);
            }

            const projects = [];
            files.forEach(file => {
                file = String(file);
                if (file.substring(file.lastIndexOf('.') + 1, file.length) === 'json') {
                    projects.push(file.substr(0, file.lastIndexOf('.')));
                }
            });
            return resolve(projects);
        });
    });
}
// Create folders if not present;
_checkAndCreateFile(__projectDir, true);
_checkAndCreateFile(__synthDir, true);
_checkAndCreateFile(__tracksDir, true);

function updateProject(req, res, next) {
    if (!req.body.projectName) {
        return next('Project name not found');
    }

    const fileName = req.body.projectName + '.json';
    fs.writeFile(path.join(__projectDir, fileName), JSON.stringify(req.body.configuration || {}, null, 4), (err) => {
        if (err)
            return next(err);
        console.log(`The file - ${fileName} has been saved!`);
        res.send();
    });
};

function listProjects(req, res, next) {
    _listFilesFromDir(__projectDir).then(files => {
        res.send(files);
    }).catch(next);
}

function loadProject(req, res, next) {
    if (!req.query.projectName) {
        return next('Project name is not found');
    }
    const fileName = String(req.query.projectName) + '.json';
    const fileStat = _checkAndCreateFile(path.join(__projectDir, fileName));
    if (!fileStat) {
        return next('Project is not found. Contact us.');
    }

    fs.readFile(path.join(__projectDir, fileName), (err, data) => {
        if (err)
            return next(err);
        console.log(JSON.parse(data));

        return res.send(data);
    });
}

async function updateSynthProject(req, res, next) {
    const { projectName, channels, trackId, trackConfig } = req.body;
    if (!projectName) {
        return next('Project name is invalid');
    }

    let gentrackId = trackId;

    // Update track
    if (trackConfig) {
        trackConfig.synthName = projectName;
        gentrackId = await _updateTrack(trackId, trackConfig);
    }

    const fileName = String(projectName) + '.json';

    if (channels) {
        const payload = {
            projectName: projectName,
            channels: channels,
            trackId: gentrackId
        }
        fs.writeFile(path.join(__synthDir, fileName), JSON.stringify(payload, null, 4), (err) => {
            if (err)
                return next(err);
            console.log('The file has been saved!');
            res.send({ trackId: gentrackId });
        });
    } else {
        res.send({ trackId: gentrackId });
    }
};

function listSynthesizers(req, res, next) {
    _listFilesFromDir(__synthDir).then(files => {
        res.send(files);
    }).catch(next);
};

function loadSynthesizer(req, res, next) {
    _loadSynthesizer(req.query.projectName).then(data => {
        res.json(data);
    }).catch(err => {
        next(err);
    });
}

function _loadSynthesizer(projectName) {
    return new Promise((resolve, reject) => {
        if (!projectName) {
            return reject('Project name is invalid');
        }
        const fileName = String(projectName) + '.json';
        const fileStat = _checkAndCreateFile(path.join(__synthDir, fileName));
        if (!fileStat) {
            return reject('Project is not found. Contact us.');
        }

        fs.readFile(path.join(__synthDir, fileName), (err, data) => {
            if (err)
                return reject(err);

            return resolve(JSON.parse(data));
        });
    });
};

function _updateTrack(trackId, trackConfig) {
    return new Promise((resolve, reject) => {
        if (!trackId) {
            trackId = uuidv4();
        }

        fs.writeFile(path.join(__tracksDir, trackId + '.json'), JSON.stringify(trackConfig, null, 4), (err) => {
            if (err)
                return reject(err);
            console.log(`The track ${trackId} file has updated!`);
            resolve(trackId);
        });
    });
}

function loadTrack(req, res, next) {
    if (!req.query.trackId) {
        return next('Track id is invalid');
    }
    const fileName = String(req.query.trackId) + '.json';
    const fileStat = _checkAndCreateFile(path.join(__tracksDir, fileName));
    if (!fileStat) {
        return next('Track is not found. Contact us.');
    }

    fs.readFile(path.join(__tracksDir, fileName), (err, data) => {
        if (err)
            return next(err);
        console.log(JSON.parse(data));

        return res.send(data);
    });
}

function loadTrackBySentheziser(req, res, next) {
    _loadSynthesizer(req.query.projectName).then(synth => {
        if (synth && synth.trackId) {
            req.query.trackId = synth.trackId;
            return loadTrack(req, res, next);
        }
        return next('Track exists but not saved yet. Please go to manage tracks and save a clip.');
    }).catch(err => {
        next(err);
    });
}

module.exports = (app) => {
    app.post('/api/project', updateProject);

    app.get('/api/project', listProjects);

    app.get('/api/project/load', loadProject);

    app.post('/api/synthesizer/update', updateSynthProject);

    app.get('/api/synthesizer/list', listSynthesizers);

    app.get('/api/synthesizer/load', loadSynthesizer);

    app.get('/api/track/load', loadTrack);

    app.get('/api/track/load/bysnth', loadTrackBySentheziser);
}

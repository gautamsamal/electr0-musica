const path = require('path');
const fs = require('fs');

const __projectDir = path.join(__dirname, '__projects');
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
// Create folders if not present;
_checkAndCreateFile(__projectDir, true);
_checkAndCreateFile(__synthDir, true);

function _createProject(req, res, next) {
    res.send('Poject created');
};

function _updateSynthProject(req, res, next) {
    if (!req.body.projectName) {
        return next('Project name is invalid');
    }
    const fileName = String(req.body.projectName) + '.json';

    if (req.body.configuration) {
        fs.writeFile(path.join(__synthDir, fileName), JSON.stringify(req.body.configuration, null, 4), (err) => {
            if (err)
                return next(err);
            console.log('The file has been saved!');
            res.send();
        });
    } else {
        res.send();
    }
};

function _listSynthesizers(req, res, next) {
    fs.readdir(__synthDir, function (err, files) {
        if (err) {
            return next(err);
        }

        const projects = [];
        files.forEach(file => {
            file = String(file);
            if (file.substring(file.lastIndexOf('.') + 1, file.length) === 'json') {
                projects.push(file.substr(0, file.lastIndexOf('.')));
            }
        });
        return res.send(projects);
    });
};

function _loadSynthesizer(req, res, next) {
    if (!req.query.projectName) {
        return next('Project name is invalid');
    }
    const fileName = String(req.query.projectName) + '.json';
    const fileStat = _checkAndCreateFile(path.join(__synthDir, fileName));
    if (!fileStat) {
        return next('Project is not found. Contact us.');
    }

    fs.readFile(path.join(__synthDir, fileName), (err, data) => {
        if (err)
            return next(err);
        console.log(JSON.parse(data));

        return res.send(data);
    });
};

module.exports = (app) => {
    app.get('/api/project', _createProject);

    app.post('/api/synthesizer/update', _updateSynthProject);

    app.get('/api/synthesizer/list', _listSynthesizers);

    app.get('/api/synthesizer/load', _loadSynthesizer);
}

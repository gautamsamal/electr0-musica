
function _createProject(req, res, next) {
    res.send('Poject created');
};

module.exports = (app) => {
    app.get('/api/project', _createProject);
}
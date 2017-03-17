var logger = require('./logger');

function logRequest(env) {
  return function(req, res, next) {
    //var level = (env === 'development') ? 'debug': 'info';
    var level = (process.env.MODE === 'development') ? 'debug': 'info';
    logger.log(level, '\t---------------------------------->>');
    logger.log(level, '\treq.protocol: %s', req.protocol);
    logger.log(level, '\treq.headers["content-type"]: %s', req.headers['content-type']);
    logger.log(level, '\treq.headers["content-length"]: %s', req.headers['content-length']);
    logger.log(level, '\treq.headers["cookie"]: %s', req.headers['cookie']);
    logger.log(level, '\t%s %s', req.method, req.originalUrl);
    next();
  };
}


function logRequestParams() {
  return function(req, res, next) {
    var level = (req.app.get('env') === 'development') ? 'debug': 'info';
    logger.log(level, '\treq.query: %j', req.query, {});
    logger.log(level, '\treq.body: %j', req.body, {});
    logger.log(level, '\treq.file: %j', req.file, {});
    logger.log(level, '\treq.files: %j', req.files, {});
    next();
  };
}


function logSql(query) {
  var level = (process.env.MODE === 'development') ? 'debug': 'info';
  logger.log(level, '\t\t--------------------------->>');
  logger.log(level, '\t\tquery.values: %s', query.values);
  logger.log(level, '\t\tquery.sql: %s', query.sql);
  if(query._results[0]) {
    logger.log(level, '\t\tquery._result[0].length: %d', query._results[0].length);
    logger.log(level, '\t\tquery._result[0].affectedRows: %d', query._results[0].affectedRows);
    logger.log(level, '\t\tquery._result[0].changedRows: %d', query._results[0].changedRows);
    logger.log(level, '\t\tquery._result[0].insertId: %d', query._results[0].insertId);
    logger.log(level, '\t\tquery._result[0].message: %s', query._results[0].message);
  } else {
    let err = query._callback.arguments[0];
    logger.log('error', '\t\tquery: %j', err, {});
    logger.log('error', '\t\terr.errno: %d, err.message: %s', err.errno, err.message);
  }
}


module.exports.logRequest = logRequest;
module.exports.logRequestParams = logRequestParams;
module.exports.logSql = logSql;

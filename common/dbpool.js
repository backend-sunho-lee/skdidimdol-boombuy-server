var mysql = require('mysql');
var dbPoolConfig = require('../config/aws_rds');
var logger = require('./logger');

var dbPool = mysql.createPool(dbPoolConfig);

// release 할 때 발생한다.
// 개발중에만 설정하고, 실제로 돌릴 때는 빼야한다   -- acquiring + free = all 이어야 한다.
dbPool.on('release', function (conn) {
  logger.log('debug', 'connection ' + conn.threadId + ' is released!!!!!'
           + '\n  ...  pool._allConnections.length: ' + dbPool._allConnections.length
           + '  ...  pool._acquiringConnections.length: ' + dbPool._acquiringConnections.length
           + '  ...  pool._freeConnections.length: ' + dbPool._freeConnections.length);
});

module.exports.dbPool = dbPool;
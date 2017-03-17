var express = require('express');
var router = express.Router();
var logger = require('../common/logger');
var logRequestParams = require('../common/logging').logRequestParams;

//!* GET users listing. *!/
// router.get('/', function(req, res, next) {
//   logger.log('debug', 'req.query: %j', req.query, {});
//   res.send('respond with a resource');
// });

router.get('/', logRequestParams(), function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;

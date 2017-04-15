var express = require('express');
var router = express.Router();
var logger = require('../common/logger');
var logRequestParams = require('../common/logging').logRequestParams;

/**
 * @apiDefine BadRequest
 * @apiError BadRequest All values ​​are not entered.
 */

router.get('/', logRequestParams(), function(req, res, next) {
  res.send('respond with a resource');
});

module.exports = router;

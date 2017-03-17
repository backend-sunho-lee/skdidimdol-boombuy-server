var express = require('express');
var router = express.Router();
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var Brand = require('../models/brand');
var logger = require('../common/logger');
var logRequestParams = require('../common/logging').logRequestParams;

var multer = require('multer');
var multerS3 = require('multer-s3');  // 함수 인자로 storage 넘겨줌
var AWS = require('aws-sdk');
var s3Config = require('../config/aws_s3');
var S3 = new AWS.S3({   // s3 client 객체 생성 -네트워크 기능 가지고 있다
  region: s3Config.region,
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey
});
var path = require('path');
var util = require('util');
var async = require('../common/logger');
var upload = multer({
  storage: multerS3({
    s3: S3,
    bucket: 'boombuy',
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, {
        ACL: 'public-read',
        fieldName: file.fieldname
      });
    },
    // key를 임의로 만들 수 있다
    key: function (req, file, cb) {   // photos가 key가 된다
      cb(null, 'brandsPhotos/' + Date.now().toString())
    }
  })
});


//TODO 7번 브랜드 목록 조회 O
router.get('/', logRequestParams(), isSecure, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);

  if (!page || !rows) {
    err = new Error('브랜드 목록 조회 실패');
    return next(err);
  }

  Brand.printBrands(page, rows, function (err, brands, msg) {
    if (err || brands.length === 0) {
      err = new Error('브랜드 목록 조회 실패');
      return next(err);
    }
    res.json({
      message : msg,
      result: brands
    });
  });
});

//TODO 8번 브랜드별 상품 목록 조회 O
router.get('/:bid', logRequestParams(), isSecure, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);
  var bid = req.params.bid;

  var pattern = /[0-9]/;
  if (pattern.test(bid) === false) {
    err = new Error('잘못된 브랜드 번호입니다.');
    return next(err);
  }

  if (!bid || !page || !rows) {
    err = new Error('브랜드별 상품 목록 조회 실패');
    return next(err);
  }

  Brand.printItemsByBrands(page, rows, bid, function(err, items, msg) {
    if (err || items.length === 0) {
      err = new Error('브랜드별 상품 목록 조회 실패');
      return next(err);
    } else {
      res.json({
        message : msg,
        result: items
      });
    }
  });
});


module.exports = router;

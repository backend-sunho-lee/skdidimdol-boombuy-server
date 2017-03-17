var express = require('express');
var router = express.Router();
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var Item = require('../models/item');

var path = require('path');
var util = require('util');
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
      cb(null, 'itemsPhotos/' + Date.now().toString())
    }
  })
});

//TODO 6번 전체 상품 목록 조회_O
router.get('/', logRequestParams(), isSecure, function (req, res, next) {
  var ipage = parseInt(req.query.page);
  var irows = parseInt(req.query.rows);

  if (!ipage || !irows) {
    err = new Error('전체 상품 조회 실패');
    return next(err);
  }

  Item.printItems(ipage, irows, function (err, msg, items) {
    if (err || items.length == 0) {
      err = new Error('전체 상품 조회 실패');
      return next(err);
    } else {
      res.json({
        message: msg,
        result: items
      });
    }
  });
});

//TODO 9번 상품권 상품 목록 조회 O
router.get('/voucher', logRequestParams(), isSecure, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);

  if (!page || !rows) {
    err = new Error('상품권 상품 목록 조회 실패');
    return next(err);
  }

  Item.printVoucherItems(page, rows,function(err, items, msg) {
    if (err) {
      err = new Error('상품권 상품 목록 조회 실패');
      return next(err);
    } else {
      res.json({
        message: msg,
        result: items
      });
    }
  });
});

// TODO 10번 '상품 상세' 조회 O
router.get('/:iid', logRequestParams(), isSecure, function (req, res, next) {
  var iid = req.params.iid;

  // var pattern = /[0-9]/;
  // if (pattern.test(iid) === false) {
  //   err = new Error('잘못된 결제 번호입니다.');
  //   return next(err);
  // }

  Item.showItemDetail(iid, function (err, item) {
    if (err || item.length === 0 ) {
      err = new Error('상품 상세정보 조회 실패');
      return next(err);
    } else {
      res.json({
        result: item
      });
    }
  });
});


module.exports = router;

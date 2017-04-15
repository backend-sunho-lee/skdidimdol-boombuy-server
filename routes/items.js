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

/**
 * @api {get} /items Item listing
 * @apiName GetItems
 * @apiGroup Items
 * @apiDescription 모든 상품 목록을 조회한다.
 *
 * @apiParam {Number} page Page number
 * @apiParam {Number} rows Number of outputs per page.
 *
 * @apiSuccess {String} message Next Page URL
 * @apiSuccess {Array} result Items info
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "다음 페이지 URL"
 *      "result": [
 *        {
 *          "id": 1   // 상품 번호,
 *          "bid": 2  // 브랜드 번호,
 *          "name": "상품 이름",
 *          "price": 11900   // 상품 가격,
 *          "detail": "상품정보",
 *          "notice": "주의사항",
 *          "location": "상품 이미지 URL"
 *        }, ...
 *      ]
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "All Items Listing Failed"
 *    }
 */
router.get('/', logRequestParams(), isSecure, function (req, res, next) {
  var ipage = parseInt(req.query.page);
  var irows = parseInt(req.query.rows);

  if (!ipage || !irows) {
    err = new Error('All Items listing Failed');
    return next(err);
  }

  Item.printItems(ipage, irows, function (err, msg, items) {
    if (err || items.length == 0) {
      err = new Error('All Items listing Succeed');
      return next(err);
    } else {
      res.json({
        message: msg,
        result: items
      });
    }
  });
});

/**
 * @api {get} /items/voucher Vouchers listing
 * @apiName GetVoucher
 * @apiGroup Items
 * @apiDescription 모든 상품권 목록을 조회한다.
 *
 * @apiParam {Number} page Page number
 * @apiParam {Number} rows Number of outputs per page.
 *
 * @apiSuccess {String} message Next Page URL
 * @apiSuccess {Array} result Items info
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "다음 페이지 URL"
 *      "result": [
 *        {
 *          "id": 1   // 상품 번호,
 *          "bid": 2  // 브랜드 번호,
 *          "name": "상품 이름",
 *          "price": 11900   // 상품 가격,
 *          "detail": "상품정보",
 *          "notice": "주의사항",
 *          "location": "상품 이미지 URL"
 *        }, ...
 *      ]
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "All Voucher Listing Failed"
 *    }
 */
router.get('/voucher', logRequestParams(), isSecure, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);

  if (!page || !rows) {
    err = new Error('All Voucher Listing Failed');
    return next(err);
  }

  Item.printVoucherItems(page, rows,function(err, items, msg) {
    if (err) {
      err = new Error('All Voucher Listing Failed');
      return next(err);
    } else {
      res.json({
        message: msg,
        result: items
      });
    }
  });
});

/**
 * @api {get} /items/:iid Item info
 * @apiName GetItemsInfo
 * @apiGroup Items
 * @apiDescription iid에 해당하는 상품 정보를 조회한다.
 *
 * @apiSuccess {Array} result Items info
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "result": [
 *        {
 *          "id": 1   // 상품 번호,
 *          "name": "상품 이름",
 *          "price": 11900   // 상품 가격,
 *          "detail": "상품정보",
 *          "location": "상품 이미지 URL"
 *        }
 *      ]
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Item info Failed"
 *    }
 */
router.get('/:iid', logRequestParams(), isSecure, function (req, res, next) {
  var iid = req.params.iid;

  Item.showItemDetail(iid, function (err, item) {
    if (err || item.length === 0 ) {
      err = new Error('Item info Failed');
      return next(err);
    } else {
      res.json({
        result: item
      });
    }
  });
});


module.exports = router;

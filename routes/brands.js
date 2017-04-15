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

/**
 * @api {get} /brands Brands listing
 * @apiName GetBrands
 * @apiGroup Brands
 * @apiDescription 브랜드 목록을 조회한다.
 *
 * @apiParam {Number} page Page number
 * @apiParam {Number} rows Number of outputs per page.
 *
 * @apiSuccess {String} message Next Page URL
 * @apiSuccess {Array} result Brands info
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "다음 페이지 URL"
 *      "result": [
 *        {
 *         "bid": 1   // 브랜드 번호,
 *         "name": "브랜드 이름",
 *         "notice": "브랜드 구매 주의사항"
 *         "location": "브랜드 이미지 사진 URL"
 *        }, ...
 *      ]
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Brand Listing Failed"
 *    }
 */
router.get('/', logRequestParams(), isSecure, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);

  if (!page || !rows) {
    err = new Error('Brand Listing Failed');
    err.status = 400;
    return next(err);
  }

  Brand.printBrands(page, rows, function (err, brands, msg) {
    if (err || brands.length === 0) {
      err = new Error('Brand Listing Failed');
      err.status = 400;
      return next(err);
    }
    res.json({
      message : msg,
      result: brands
    });
  });
});

/**
 * @api {get} /brands/:bid Item listing by brand
 * @apiName GetItemsByBrands
 * @apiGroup Brands
 * @apiDescription bid에 해당하는 브랜드의 상품 목록을 조회한다.
 *
 * @apiParam {Number} bid Brand number
 * @apiParam {Number} page Page number
 * @apiParam {Number} rows Number of outputs per page.
 *
 * @apiSuccess {String} message Next Page URL
 * @apiSuccess {Array} result Brands info
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
 *      "message": "Item Listing by brand Failed"
 *    }
 */
router.get('/:bid', logRequestParams(), isSecure, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);
  var bid = req.params.bid;

  var pattern = /[0-9]/;
  if (pattern.test(bid) === false) {
    err = new Error('Brand Number is Wrong');
    return next(err);
  }

  if (!bid || !page || !rows) {
    err = new Error('Item Listing by brand Failed');
    return next(err);
  }

  Brand.printItemsByBrands(page, rows, bid, function(err, items, msg) {
    if (err || items.length === 0) {
      err = new Error('Item Listing by brand Failed');
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
var express = require('express');
var router = express.Router();
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var Order = require('../models/order');

var path = require('path');
var util = require('util');
var logger = require('../common/logger');
var logRequestParams = require('../common/logging').logRequestParams;

var User = require('../models/user');
var FCM = require('fcm').FCM;

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
 * @api {post} /orders Order Registration
 * @apiName PostOrder
 * @apiGroup Order
 * @apiDescription 주문을 등록한다. 주문 등록 성공시, 선물 받는 사람과 보내는 사람들에게 FCM 알림을 보낸다.
 *
 * @apiParam {Number} receiver A friend to present
 * @apiParam {Array} senders Friends to send gifts
 * @apiParam {Array} carts Items to present
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "Order Registration Succeed"
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Order Registration Failed"
 *    }
 */
router.post('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var receiver = req.body.receiver;             // 1
  var senders = req.body.senders;
  var carts = req.body.carts;
  var myphone = req.user.phone;
  var pattern = /[0-9]/;

  if (!receiver || !senders || !carts) {
    err = new Error('Order Registration Failed');
    return next(err);
  }

  var phoneBuckets = [];
  for (var i in senders) {
    if (senders[i].phone !== myphone) {
      phoneBuckets.push(senders[i].phone);
    }
  }

  Order.makeOrder({
    receiver: receiver,
    senders: senders,
    carts: carts
  }, function (err, orderlist) {
    if (err)
      return next(err);

    User.alaramForToken(phoneBuckets, function (err, tokens) {
      var apiKey = 'AAAAoDlYHZU:APA91bGSLmkIWpcvbZI98lZWUcUQMlhjmOySgolJ0MpxHKPgmlYRe8jR-wDOfJQCC1uTMR1A9vEO9-2Uc3I1h0UZGWH7EH_HR5QuETVMS1QQMkhnHq2e48-jTuzCOXsl0dJrzvcHiVIz';
      var fcm = new FCM(apiKey);

      for (var i in tokens) {
        var message = {
          registration_id: tokens[i], // required
          collapse_key: Math.floor(Math.random() * 10000),
          'data.key1': orderlist.aid
        };

        fcm.send(message, function (err, messageId) {
          if (err) {
            console.log("Something has gone wrong!");
          } else {
            console.log("Sent with message ID: ", messageId);
          }
        });
      }
    });

    res.json({
      message: orderlist.aid
      //, result: orderlist
    });
  })
});

/**
 * @api {get} /orders/send Sent orders listing
 * @apiName GetSendOrder
 * @apiGroup Order
 * @apiDescription 사용자가 보낸 선물 목록을 조회한다.
 *
 * @apiSuccess {Array} result Sent orders listing
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "result": [
 *        {
 *          "oid": 10   // 주문번호,
 *          "state": "진행중"  // 주문 진행 상태,
 *          "orderstime": "2017-04-15T04:47:26.000Z"  // 주문등록 시간,
 *          "receiver": "받는사람 이름",
 *          "receiverphoto": "받는 사람 이미지 URL",
 *          "sender": "보내는 사람 이름",
 *          "senderphoto": "보내는 사람 중 대표 이미지 URL",
 *          "cnt": 1  // 보내는 사람 중 대표자를 뺀 사람 수
 *        },
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "sent orders listing Failed"
 *    }
 */
router.get('/send', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.phone;

  Order.printSendlist(uid, function (err, sendlist) {
    if (err) {
      err = new Error('Sent orders listing Failed');
      return next(err);
    }

    res.json({
      result: sendlist
    })
  })
});
/*
// 보낸 선물 리스트 조회 -페이징처리
router.get('/send', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.phone;
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);
  if (!page || !rows) {
    err = new Error('보낸 선물 조회 실패!');
    return next(err);
  }

  Order.printSendlist(page, rows, uid, function (err, sendlist, msg) {
    if (err) {
      err = new Error('보낸 선물 조회 실패!');
      return next(err);
    }

    res.json({
      message: msg,
      result: sendlist
    })
  })
});
*/

/**
 * @api {get} /orders/send/:oid Sent order info
 * @apiName GetSendOrderInfo
 * @apiGroup Order
 * @apiDescription oid에 해당하는 보낸 선물의 정보를 조회한다.
 *
 * @apiParam {Number} oid Order number
 *
 * @apiSuccess {Array} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "result": [
 *        "orders": {
 *           "oid": 9   // 주문번호,
 *           "state": "주문진행 상태",
 *           "orderstime": "주문등록한 시간",
 *           "receiver": "선물받을 사람",
 *           "receiverphoto": "선물받을 사람 이미지 URL",
 *           "sender": "선물보낸 사람 중 대표자",
 *           "senderphoto": "대표자 이미지 URL",
 *           "cnt": 0
 *         },
 *         "settlements": [
 *           {
 *             "oid": 9   // 주문번호,
 *             "sender": "보내는사람 번호",
 *             "name": "보내는사람 이름",
 *             "cost": 10000  // 구매할 총 금액,
 *             "state": "결제 상태",
 *             "location": "보내는사람 이미지 URL"
 *           }
 *         ],
 *         "carts": [
 *           {
 *             "oid": 9   // 주문번호,
 *             "iid": 3   // 상품번호,
 *             "name": "상품 이름",
 *             "price": 24000   // 상품 가격,
 *             "location": "상품 이미지 URL"
 *           }, ...
 *         ]
 *       }
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Order info Failed"
 *    }
 */
router.get('/send/:oid', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var oid = req.params.oid;
  var uid = req.user.phone;

  var pattern = /[0-9]/;
  if (pattern.test(oid) === false) {
    err = new Error('잘못된 주문 번호입니다.');
    return next(err);
  }

  Order.printSentGift(oid, uid, function (err, sendgift) {
    if (err) {
      err = new Error('보낸 선물 조회 실패!');
      return next(err);
    }

    res.json({
      result: sendgift
    })
  })
});

/**
 * @api {get} /orders/receive Receive orders listing
 * @apiName GetReceiveOrder
 * @apiGroup Order
 * @apiDescription 사용자가 받은 선물 목록을 조회한다.
 *
 * @apiSuccess {Array} result Receive Orders listing
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "result": [
 *        {
 *          "oid": 10   // 주문번호,
 *          "state": "주문 진행 상태",
 *          "orderstime": "주문등록 시간",
 *          "receiver": "받는사람 이름",
 *          "receiverphoto": "받는 사람 이미지 URL",
 *          "sender": "보내는 사람 이름",
 *          "senderphoto": "보내는 사람 중 대표 이미지 URL",
 *          "cnt": 1  // 보내는 사람 중 대표자를 뺀 사람 수
 *        },
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Receive orders listing Failed"
 *    }
 */
router.get('/receive', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.phone;

  Order.printReceivedGift(uid, function (err, orderlists) {
    if (err) {
      err = new Error('Receive orders listing Failed');
      return next(err);
    }

    res.json({
      result: orderlists
    })
  })
});
/*
 // 16번 받은 선물 조회 -페이징처리
 router.get('/receive', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
 var phone = req.user.phone;
 var page = parseInt(req.query.page);
 var rows = parseInt(req.query.rows);
 if (!page || !rows) {
 err = new Error('받은 선물 조회 실패!');
 return next(err);
 }

 Order.printReceivedGift(page, rows, phone, function (err, orderlists, msg) {
 if (err) {
 err = new Error('받은 선물 조회 실패!');
 return next(err);
 }

 res.json({
 message: msg,
 result: orderlists
 })
 })
 });*/

/**
 * @api {put} /orders/:oid Update settlement status
 * @apiName PutOrder
 * @apiGroup Order
 * @apiDescription oid에 해당하는 사용자의 결제 상태를 변경한다.
 *                 주문상태 변경 후, 모두 결제 완료 알림이 발송되고, 한명이 남았을 경우 독촉 알림이 발송된다.
 *
 * @apiParam {Number} oid Order number
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "결제 성공! 주문이 완료됐습니다. 알람이 발송 됩니다."
 *    }
 *    {
 *      "message": "결제 성공! '가나다'님만 결제하면 주문이 완료됩니다."
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Order Registration Failed"
 *    }
 */
router.put('/:oid', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var oid = req.params.oid;
  var state = parseInt(req.body.state);
  var sender = req.user.phone;
  var phonefortoken;

  if (!oid || !state) {
    err = new Error('Update settlement status Failed');
    return next(err);
  }

  Order.senderUpdate(oid, state, sender, function (err, msg, phonebuckets) {
    if (err) {
      err = new Error('Update settlement status Failed');
      return next(err);
    }

    phonefortoken = phonebuckets;
    if (msg === ' 주문이 완료되었습니다.') {
      User.alaramForToken2(phonefortoken, function (err, tokens) {
        console.log(tokens + '22222222');
        if (err)
          return next(err);

        var apiKey = 'AAAAoDlYHZU:APA91bGSLmkIWpcvbZI98lZWUcUQMlhjmOySgolJ0MpxHKPgmlYRe8jR-wDOfJQCC1uTMR1A9vEO9-2Uc3I1h0UZGWH7EH_HR5QuETVMS1QQMkhnHq2e48-jTuzCOXsl0dJrzvcHiVIz';
        var fcm = new FCM(apiKey);


        var message = {
          registration_id: tokens, // required
          collapse_key: Math.floor(Math.random() * 10000),
          'data.key1': 'receiver/' + oid
        };

        fcm.send(message, function (err, messageId) {
          if (err) {
            console.log("Something has gone wrong!");
          } else {
            console.log("Sent with message ID: ", messageId);
          }
        });

      });
      res.json({
        message: '결제 성공! ' + msg + ' 알람이 발송 됩니다.'
      });
    } else {
      res.json({
        message: '결제 성공! ' + msg
      });
    }
  });
});

/*
 // 이니시스 결제 상태 받기
 router.get('/pay', logRequestParams(), function (req, res, next) {
 console.log( "check >>> 결제코드:"+req.query.imp_uid );
 console.log( "check >>> 상품코드:"+req.query.merchant_uid );
 console.log( "check >>> 결과:"+req.query.imp_success );

 logger.log('debug', 'CHECK! >>> %j', req.query);

 res.json({
 message: '결제 상태 입력 성공!'
 });
 //res.render("index");
 });
 */

module.exports = router;
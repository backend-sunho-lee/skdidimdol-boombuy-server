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


// 14번 주문 등록 _O
router.post('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var receiver = req.body.receiver;             // 1
  var senders = req.body.senders;
  var carts = req.body.carts;
  //var senders = JSON.parse(req.body.senders);   // [{"uid": 1, "cost": 5000}, {}, {}]
  //var carts = JSON.parse(req.body.carts);       // [1, 3, 5]
  var myphone = req.user.phone;
  var pattern = /[0-9]/;


  if (!receiver || !senders || !carts) {
    err = new Error('주문 등록 실패!');
    return next(err);
  }


  var phoneBuckets = [];
  for (var i in senders) {

    if (senders[i].phone !== myphone) {
      //       console.log(myphone +'aefafaefaf'+ senders[i].phone + 'bbbbbbbbbbb');
      phoneBuckets.push(senders[i].phone);
      //     console.log(phoneBuckets+'mmmmmm');
    }
  }
  Order.makeOrder({
    receiver: receiver,
    senders: senders,
    carts: carts
  }, function (err, orderlist) {
    if (err) {
      // err = new Error('주문 등록 실패!');
      return next(err);
    }

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

// 보낸 선물 리스트 조회
router.get('/send', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.phone;

  Order.printSendlist(uid, function (err, sendlist) {
    if (err) {
      err = new Error('보낸 선물 조회 실패!');
      return next(err);
    }

    res.json({
      result: sendlist
    })
  })
});
/*// TODO 보낸 선물 리스트 조회 -페이징처리
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
 });*/

// 보낸 선물 정보 조회
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

// 16번 받은 선물 조회 _
router.get('/receive', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.phone;

  Order.printReceivedGift(uid, function (err, orderlists) {
    if (err) {
      err = new Error('받은 선물 조회 실패!');
      return next(err);
    }

    res.json({
      result: orderlists
    })
  })
});
// 16번 받은 선물 조회 -페이징처리
/*
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

/*// 18번 결제 상태 변경
 router.put('/:oid', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
 var oid = req.params.oid;
 var sender = req.user.phone;

 if (!oid) {
 err = new Error('결제 변경 실패');
 return next(err);
 }
 var pattern = /[0-9]/;
 if (pattern.test(oid) === false) {
 err = new Error('잘못된 주문 번호입니다.');
 return next(err);
 }

 var phonefortoken;


 Order.senderUpdate(oid, sender, function (err, msg, phonebuckets) {
 if (err) {
 err = new Error('결제 변경 실패');
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
 });*/
// 18번 결제 상태 변경: 취소 or 완료
router.put('/:oid', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var oid = req.params.oid;
  var state = parseInt(req.body.state);
  var sender = req.user.phone;
  var phonefortoken;

  if (!oid || !state) {
    err = new Error('결제 변경 실패');
    return next(err);
  }
  // var pattern = /[1-2]/;
  // if (pattern.test(oid) === false) {
  //   err = new Error('잘못된 주문 번호입니다.');
  //   return next(err);
  // }
  // if (pattern.test(state) === false) {
  //   err = new Error('잘못된 주문 번호입니다.');
  //   return next(err);
  // }

  Order.senderUpdate(oid, state, sender, function (err, msg, phonebuckets) {
    if (err) {
      err = new Error('결제 변경 실패');
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

/*// TODO 14번 주문 등록 _O
 router.post('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
 var receiver = req.body.receiver;             // 1
 // var senders = req.body.senders;
 // var carts = req.body.carts;
 var senders = JSON.parse(req.body.senders);   // [{"phone": 1, "cost": 5000}, {}, {}]
 var carts = JSON.parse(req.body.carts);       // [1, 3, 5]

 Order.makeOrder({
 receiver: receiver,
 senders: senders,
 carts: carts
 }, function (err, orderlist) {
 if (err) {
 err = new Error('주문 등록 실패!');
 return next(err);
 }

 res.json({
 message: '주문을 등록하였습니다.'
 });
 })
 });*/
/*
 // TODO 15번 보낸 선물 조회 _
 router.get('/send', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
 var uid = req.user.id;

 logger.log('debug', 'uid: %s, page: %s, rows: %s', uid);

 Order.printSentGift(uid, function (err, ordernums, sentGifts) {
 if (err) {
 err = new Error('보낸 선물 조회 실패!');
 return next(err);
 }
 console.log(ordernums + sentGifts + 'ggggggggg');
 res.json({
 result: sentGifts
 })
 })
 });
 */
/*// TODO 17 번 주문 상태 변경
 router.put('/:oid', logRequestParams(), isSecure, function (req, res, next) {
 var oid = req.params.oid;

 Order.settlement(oid, function (err, msg) {
 if (err)
 return next(err);

 res.json({
 message: msg
 });
 });

 });*/

var express = require('express');
var router = express.Router();
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var User = require('../models/user');

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
      cb(null, 'usersPhotos/' + Date.now().toString())
    }
  })
});
var gcm = require('node-gcm');

/**
 * @api {post} /users Sign Up
 * @apiName PostUser
 * @apiGroup User
 * @apiDescription 사용자가 입력한 phone, name, password와 FCM token을 입력받아 회원가입한다.
 *
 * @apiParam {Number} phone Users unique Phone number.
 * @apiParam {String} name Users unique Name.
 * @apiParam {String} password Users unique Password.
 * @apiParam {String} token Users unique FCM token.
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *       "message": "Sign Up Succeed"
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Sign Up Failed"
 *    }
 */
router.post('/', logRequestParams(), isSecure, function (req, res, next) {
  var phone = req.body.phone;
  var name = req.body.name;
  var password = req.body.password;
  var token = req.body.token;
  var pattern = /[0-9]/;
  var pattern2 = /[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]/;

  name = name.replace(/(\s*)/g, "");
  phone = phone.replace(/(\s*)/g, "");

  if (!phone || !name || !password || !token) {
    err = new Error('Entered values are incorrect');
    return next(err);
  } else if (password.length > 15) {
    err = new Error('Password length is incorrect');
    return next(err);
  } else if (phone.length !== 11) {
    err = new Error('phone length is incorrect');
    return next(err);
  } else if (phone.substr(0, 3) !== '010') {
    err = new Error('The number must start with 010');
    return next(err);
  }

  for (let i in phone) {
    if (pattern.test(phone.charAt(i)) === false) {
      err = new Error('Invalid phone format');
      return next(err);
    }
  }
  for (let k in name) {
    if (pattern2.test(name.charAt(k)) === false) {
      err = new Error('Invalid name format');
      return next(err);
    }
  }

  User.create({
    phone: phone,
    name: name,
    password: password,
    token: token
  }, function (err) {
    if (err) {
      err = new Error('Sign Up Failed');
      return next(err);
    }

    res.json({
      message: 'Sign Up Succeed'
    });
  })
});

// 회원탈퇴
router.delete('/me', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var phone = req.user.phone;

  User.quit(phone, function (err) {
    if (err) {
      err = new Error('회원탈퇴 실패');
      return next(err);
    }

    res.json({
      message: '회원탈퇴 성공'
    });
  });
});

/**
 * @api {get} /users/me User info
 * @apiName GetUser
 * @apiGroup User
 * @apiDescription 사용자의 정보를 조회한다.
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *       "message": "사용자 정보 조회 성공",
 *       "result": {
 *         "id": 469  // 사용자 번호,
 *         "phone": "사용자 전화번호",
 *         "name": "사용자 이름",
 *         "token": "사용자 토큰",
 *         "location": "사용자 이미지 URL"
 *       }
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "사용자 정보 조회 실패"
 *    }
 */
router.get('/me', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var phone = req.user.phone;

  User.findUser(phone, function (err, user) {
    if (err) {
      err = new Error('사용자 정보 조회 실패');
      return next(err);
    }

    res.json({
      message: '사용자 정보 조회 성공',
      result: user
    });
  });
});

/**
 * @api {put} /users/me Update User image
 * @apiName PutUser
 * @apiGroup User
 * @apiDescription 사용자의 프로필 사진을 변경한다.
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *       "message": "사진 변경 성공"
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "사진 변경 실패"
 *    }
 */
router.put('/me', logRequestParams(), isSecure, isLoggedIn, upload.array('photos'), function (req, res, next) {
  var uid = req.user.id;
  var photos = req.files;

  if (!photos || !photos[0] || photos[0].length == 0) {
    err = new Error('사진 입력하세요.');
    return next(err);
  }
  if (!photos[0].location){
    err = new Error('사진이 없어요.');
    return next(err);
  }
  if (photos.length !== 1) {
    err = new Error('사진 갯수는 1개로만 입력하세요.');
    return next(err);
  }

  console.log(photos + 'confirmation ' + req.files + 'confirm2' + req);

  User.updatePhoto(photos, uid, function (err) {
    if (err) {
      err = new Error('사진 변경 실패');
      return next(err);
    }

    res.json({
      message: '사진 변경 성공'
    })
  });
});

// 19번 알람
router.post('/alarm', logRequestParams(), isSecure, function (req, res, next) {
  var type = req.query.type;
  var msg = '';

  //TODO 안드로이드에서 보내주는 번호(이걸 이용해서 토큰 찾아야됨) 가데이터임

  var phonelists = ['01047843821', '01070610015', '01035815474'];

  logger.log('type: ', type);

  switch (type) {
    case 'requestSettlement':
      msg = '총무님께서 결제를 시작하였습니다.';
      break;
    case 'pressSettlement ':
      msg = '당신만 결제하면 주문이 완료됩니다.';
      break;
    case 'orderFinish':
      msg = '주문이 완료되었습니다.';
      break;
    case 'receiveGift':
      msg = '선물이 도착하였습니다.'
  }

  if (!type) {
    msg = 'PUSH 알람 type이 입력되지 않았습니다.';
    res.json(msg);
  }

  User.alaramForToken(phonelists, function (err, token) {
    var message = new gcm.Message({
      data: {
        title: 'PUSH',
        key1: msg
      }
    });

    res.json(msg + ' 토큰 :' + token);

    var sender = new gcm.Sender(IzaSyAiJNcv1DkAJ2IahteBaFVswLAyZltEPKw);

    var registrationIds = [];

    registrationIds.push(token);


    sender.send(message, registrationIds, 3, function (err, result) {
      console.log(result);
    });
  });
});

module.exports = router;

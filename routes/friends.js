var express = require('express');
var router = express.Router();
var User = require('../models/friend');
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var logger = require('../common/logger');
var logRequestParams = require('../common/logging').logRequestParams;
// logRequestParams(global.app.get('env')),


//TODO 12 친구 목록 업데이트
router.post('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
   var uid = req.user.id;
   //var phonefriends = JSON.parse(req.body.phone);
   var phonefriends = req.body.phone;

  if (!phonefriends) {
    err = new Error("No phones...");
    return next(err);
  }
  if(typeof(phonefriends) !== 'object') {
    err = new Error("Phones are not an Array");
    return next(err);
  }

    User.mappingUpdate(phonefriends, uid, function (err, result) {
        if (err) {
            err = new Error("친구 등록 및 변경 실패");
            return next(err);
        }

        res.json({
            message: '친구 등록 및 변경 성공'
        });
    });
});

//TODO 13 친구 목록 출력
router.get('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.id;

  User.mappedFriendsPrint(uid, function(err, members, cnt) {
    if (err) {
      err = new Error('친구목록 조회 실패');
      return next(err);
    }

    var msg = '친구목록 조회 성공';
    if (!cnt) {
      msg = '친구가 없습니다.';
    }

    res.json({
      message: msg,
      result: members
    });
  });
});
/*//TODO 13 친구 목록 출력 -페이징처리된것
router.get('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var page = parseInt(req.query.page);
  var rows = parseInt(req.query.rows);
  var uid = req.user.id;

  if (!page || !rows) {
    err = new Error('친구목록 조회 실패');
    return next(err);
  }

  User.mappedFriendsPrint(page, rows, uid, function(err, members, msg) {
    if (err || members.length == 0) {
      err = new Error('친구목록 조회 실패');
      return next(err);
    }

    res.json({
      message: msg,
      result: members
    });
  });
});*/

module.exports = router;
/*// TODO 11번 친구 목록 등록
 router.post('/', isSecure, isLoggedIn, function (req, res, next) {
 var uid = req.user.id;
 var phonefriend = JSON.parse(req.body.phone);
 var msg = '';

 // phonefriend.push('01047843821', '01022222232', '01051605855', '01085199709', '01090024034', '01069188808', '01069734541', '202122', '113');

 User.mappingFriend(phonefriend, uid, function (err, mUsers) {
 if (err) {
 err = new Error('친구 등록에 실패 했어요');
 next(err);
 }

 for (var i in mUsers)
 msg = msg + mUsers[i].phone + ', ';

 res.json({
 message: '친구 등록에 성공 했어요'
 });
 });
 });*/

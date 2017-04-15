var express = require('express');
var router = express.Router();
var User = require('../models/friend');
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var logger = require('../common/logger');
var logRequestParams = require('../common/logging').logRequestParams;

/**
 * @api {post} /friends Friends registration or change
 * @apiName PostFriends
 * @apiGroup Friends
 * @apiDescription 사용자 전화번호부를 불러와 그 중에서 회원가입한 사용자를 친구로 등록한다.
 *
 * @apiParam {Array} phone phone number array
 *
 * @apiSuccess {String} result Brands info
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "Friends registration or change Succeed"
 *      ]
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Friends registration or change Failed"
 *    }
 */
router.post('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
   var uid = req.user.id;
   //var phonefriends = JSON.parse(req.body.phone);
   var phonefriends = req.body.phone;

  if (!phonefriends) {
    err = new Error("No phones...");
    err.status = 400;
    return next(err);
  }
  if(typeof(phonefriends) !== 'object') {
    err = new Error("Phones are not an Array");
    return next(err);
  }

    User.mappingUpdate(phonefriends, uid, function (err, result) {
        if (err) {
            err = new Error("Friends registration or change Failed");
            return next(err);
        }

        res.json({
            message: 'Friends registration or change Succeed'
        });
    });
});

/**
 * @api {get} /friends Friends listing
 * @apiName GetFriends
 * @apiGroup Friends
 * @apiDescription 사용자의 친구 목록을 불러온다.
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccess {Array} result Friends info
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *      "message": "다음 페이지 URL"
 *      "result": [
 *        {
 *          "uid": 1   // 사용자 번호,
 *          "phone": "사용자 전화번호",
 *          "name": "사용자 이름",
 *          "location": "상품 이미지 URL"
 *        }, ...
 *      ]
 *    }
 *    {
 *      "message": "친구가 없습니다.",
 *      "result": []
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "Friends listing Failed"
 *    }
 */
router.get('/', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
  var uid = req.user.id;

  User.mappedFriendsPrint(uid, function(err, members, cnt) {
    if (err) {
      err = new Error('Friends listing Failed');
      return next(err);
    }

    var msg = 'Friends listing Success';
    if (!cnt) {
      msg = 'No Friends';
    }

    res.json({
      message: msg,
      result: members
    });
  });
});

module.exports = router;
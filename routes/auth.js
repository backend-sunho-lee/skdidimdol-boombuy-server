var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var logger = require('../common/logger');
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var logRequestParams = require('../common/logging').logRequestParams;
var path = require('path');
var util = require('util');

passport.use(new LocalStrategy({usernameField: 'phone', passwordField: 'password', passReqToCallback : true},
    function(req, phone, password, done) {
        var pattern = /[0-9]/;
        var token = req.body.token;

        if (!token) {
          err = new Error('No Token! Please insert token.');
          err.status = 400;
          return done(err);
        } else if (password.length > 15) {
            err = new Error('Password length is up to 15 digits');
            err.status = 400;
            return done(err);
        } else if (phone.substr(0, 3) !== '010') {
          err = new Error('The number must start with 010');
          err.status = 400;
          return done(err);
        }
        for (let i in phone) {
            if (pattern.test(phone.charAt(i)) === false) {
              err = new Error('Invalid phone format');
              err.status = 400;
              return done(err);
            }
        }

        User.findByPhone(phone, token, function(err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false);
            }
            User.verifyPassword(password, user, function (err, result) {
                if (err) {
                    return done(err);
                }
                if (!result) {
                    return done(null, false);
                }

                delete user.password;
                done(null, user);
            })
        });
    }));

passport.serializeUser(function (user, done) {
    done(null, user.phone, user.id);
});

passport.deserializeUser(function (phone, done) {  //function의 id는 세션id
    User.findUser(phone, function (err, user) {
        if (err) {
            return done(err)
        }
        done(null, user);
    });
});

/**
 * @api {post} /auth/local/login Local Login
 * @apiName PostLocalLogin
 * @apiGroup Auth
 * @apiDescription 사용자가 입력한 phone과 password, 사용자의 FCM 토큰을 받아 로그인한다.
 *
 * @apiParam {Number} phone Users unique Phone number.
 * @apiParam {String} password Users unique Password.
 * @apiParam {String} token Users unique token.
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *       "message": "LogIn Succeed"
 *    }
 *
 * @apiUse BadRequest
 * @apiErrorExample Error-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "message": "LogIn Failed"
 *    }
 */
router.post('/local/login', logRequestParams(), function(req, res, next) {
    passport.authenticate('local', function(err, user) {

        if (err) {
            return next(err);
        }

        if (!user){
            return res.status(401).send({
                message:'LogIn Failed'
            });
        }
        req.login(user, function(err){
            if (err) {
                return next(err);
            }
            next();
        });
    })(req, res, next);
}, function(req, res, next) {
    res.send({
        message: 'LogIn Succeed'
    })
});


/**
 * @api {get} /auth/local/logout Local LogOut
 * @apiName PostLocalLogOut
 * @apiGroup Auth
 * @apiDescription 로그아웃. 세션에서 사용자 정보를 지운다.
 *
 * @apiSuccess {String} message Success Message
 * @apiSuccessExample Success-Response:
 *    HTTP/1.1 200 OK
 *    {
 *       "message": "LogOut successful"
 *    }
 */
router.get('/local/logout', logRequestParams(), function (req, res, next) {
    req.logout();
    res.send({ message: '로그아웃 성공' });
});


module.exports = router;
var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var logger = require('../common/logger');
var isSecure = require('../common/security').isSecure;
var isLoggedIn = require('../common/security').isLoggedIn;
var logRequestParams = require('../common/logging').logRequestParams;
// logRequestParams(global.app.get('env')),
var path = require('path');
var util = require('util');

passport.use(new LocalStrategy({usernameField: 'phone', passwordField: 'password', passReqToCallback : true},
    function(req, phone, password, done) {
        var pattern = /[0-9]/;

        var token = req.body.token;

        if (!token) {
          err = new Error('No Token...');
          return done(err);
        } else if (password.length > 15) {
            err = new Error('Password length is up to 15 digits');
            return done(err);
        } else if (phone.substr(0, 3) !== '010') {
          err = new Error('The number must start with 010');
          return done(err);
        }
      // if (phone.length !== 11) {
      //   err = new Error('Phone length is incorrect');
      //   return done(err);
      // }
        for (let i in phone) {
            if (pattern.test(phone.charAt(i)) === false) {
              err = new Error('Invalid phone format');
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


// TODO 3번 로그인 _O
router.post('/local/login', logRequestParams(), function(req, res, next) {
    passport.authenticate('local', function(err, user) {

        if (err) {
            return next(err);
        }

        if (!user){
            return res.status(401).send({
                message:'로그인 실패'
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
        message: '로그인 성공'
    })
});

// TODO 4번 로그아웃 _O
router.get('/local/logout', logRequestParams(), function (req, res, next) {
    req.logout();
    res.send({ message: '로그아웃 성공' });
});

//TODO 20번 토큰 _
router.put('/local/token', logRequestParams(), isSecure, isLoggedIn, function (req, res, next) {
    var user = req.user;
    var token = req.body.token;

    if (!token){
        var err = new Error('토큰이 입력되지 않았습니다.');
        return next(err);
    }

    User.checkToken(token, user, function (err) {
        if (err) {
            err = new Error("토큰 변경이 실패했습니다.");
            return next(err);
        } else {
            res.json({
                message: '토큰 변경이 성공했습니다.'
            })
        }
    })
});


module.exports = router;


// 토큰 장착 전
/*
 var express = require('express');
 var router = express.Router();
 var passport = require('passport');
 var LocalStrategy = require('passport-local').Strategy;
 var User = require('../models/user');
 var logger = require('../common/logger');

 passport.use(new LocalStrategy({usernameField: 'phone', passwordField: 'password'},
 function (phone, password, done) {

 User.findByPhone(phone, function (err, user) {
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

 });



 });
 }));


 passport.serializeUser(function (user, done) {
 console.log('ggggggaefafafafg' + user.token + user.id + user.phone);
 done(null, user.phone, user.id, user.token);


 });

 passport.deserializeUser(function (phone, done) {  //function의 id는 세션id
 User.findUser(phone, function (err, user) {
 if (err) {
 return done(err)
 }
 done(null, user);
 });
 });

 var realt;
 // TODO 3번 로그인 _O
 router.post('/local/login', function (req, res, next) {
 passport.authenticate('local', function (err, user) {
 var tempToken = req.body.tokens;



 if (tempToken !== req.user.token) {

 User.checkToken(tempToken, user, function (err, user) {
 if (err)
 return next(err);
 realt = user.token;

 });
 }

 user.token = realt;


 if (err) {
 return next(err);
 }
 if (!user) {
 return res.status(401).send({
 message: 'Login Failed!!'
 });
 }
 req.login(user, function (err) {
 if (err) {
 return next(err);

 }
 next();
 });
 })(req, res, next);
 }, function (req, res, next) {
 res.json({
 message: 'local login'
 })
 });

 // TODO 4번 로그아웃 _O
 router.get('/local/logout', function (req, res, next) {
 req.logout();
 res.send({message: 'local logout'});
 });


 module.exports = router;
 */

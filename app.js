var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var winstonLogger = require('./common/logger');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var logRequest = require('./common/logging').logRequest;

var session = require('express-session');
var passport = require('passport');
var redis = require('redis');
var redisClient = redis.createClient();
var RedisStore = require('connect-redis')(session);

var app = express();

var index = require('./routes/index');
var users = require('./routes/users');
var auth = require('./routes/auth');
var items = require('./routes/items');
var brands = require('./routes/brands');
var orders = require('./routes/orders');
var friends = require('./routes/friends');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'boombuy_logo.png')));
app.use(bodyParser.json({limit: '5mb'}));         // 지수코드
app.use(bodyParser.urlencoded({limit: '5mb'}));   // 지수코드

app.use(logger('dev'));
app.use(logRequest(process.env.MODE));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SECRET_KEY));

app.use(session({
  secret: process.env.SECRET_KEY,
  store: new RedisStore({
    host: "127.0.0.1",
    port: 6379,
    client: redisClient
  }),
  resave: true,
  saveUninitialized: false,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: true,
    maxAge: 1000* 60 * 60 * 24 * 30
  }
}));
app.use(passport.initialize()); //초기화된 프레임워크에 접근할 수 있는 미들웨어를 반환한다.
app.use(passport.session()); //이것을 통해 express.session이 관장하는 redis와의 연동이 passport가 역할을 하게 됨
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', express.static(path.join(__dirname, 'apidoc')));
app.use('/', index);
app.use('/auth', auth);
app.use('/users', users);
app.use('/items', items);
app.use('/brands', brands);
app.use('/orders', orders);
app.use('/friends', friends);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found^~^');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message,
      //status: err.status
    }
  })
});

module.exports = app;
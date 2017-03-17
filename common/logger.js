var winston = require('winston');
var DailyRotateFile = require('winston-daily-rotate-file');
var path = require('path');
var moment = require('moment-timezone');
var timeZone = "Asia/Seoul";

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      silent: false,
      colorize: true,
      prettyPrint: true,
      timestamp: false
    }),
    new winston.transports.DailyRotateFile({
      level: 'debug',
      silent: false,
      colorize: false,
      prettyPrint: true,
      timestamp: function() {
        return moment().tz(timeZone).format();
      },
      dirname: path.join(__dirname, '../logs'),
      filename: 'debug_logs_',
      datePattern: 'yyyy-MM-ddTHH.log',
      maxsize: 1024 * 1024 * 10,
      json: false
    })
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      level: "debug",
      silent: false,
      colorize: false,
      prettyPrint: true,
      timestamp: function() {
        return moment().tz(timeZone).format();
      },
      dirname: path.join(__dirname, '../logs'),
      filename: 'exception_logs_',
      datePattern: 'yyyy-MM-ddTHH.log',
      maxsize: 1024 * 1024 * 10,
      json: false,
      handleExceptions: true,
      humanReadableUnhandledException: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
var mysql = require('mysql');
var async = require('async');
var dbPool = require('../common/dbpool').dbPool;
var aes_key = require('../config/key').aes_key;
var fs = require('fs');
var AWS = require('aws-sdk');
var s3Config = require('../config/aws_s3');
var S3 = new AWS.S3({   // s3 client 객체 생성 -네트워크 기능 가지고 있다
  region: 'ap-northeast-2',
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey
});
var logger = require('../common/logger');
var logSql = require('../common/logging').logSql;


function printBrands(ipage, irows, callback) {
  var select_brands_sql = 'select id as bid, name, notice, location ' +
    'from brands b join brands_photos bp on (b.id = bp.bid) ' +
    'where id != 28 ' +
    'limit ?, ?';
  var brand_count_sql = 'select count(*) as cnt from brands';

  var rowcnt = irows;
  var offset = (ipage - 1) * rowcnt;
  var msg = '';
  var count = 0;

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    conn.query(brand_count_sql, [], function (err, rows, fields) {
      logSql(this);
      if (err)
        return callback(err);

      count = rows[0].cnt;
      conn.query(select_brands_sql, [offset, rowcnt], function (err, rows, fields) {
        logSql(this);
        conn.release();
        if (err)
          return callback(err);

        if (count > irows * ipage) {
          msg = 'https://ec2-52-78-52-228.ap-northeast-2.compute.amazonaws.com/brands?page=' + (ipage + 1) + '&rows=' + irows;
          //msg = 'https://localhost:3443/brands?page=' + (ipage + 1) + '&rows=' + irows;
          callback(null, rows, msg);
        } else {
          msg = '마지막 페이지 입니다.';
          callback(null, rows, msg);
        }
      });
    });
  });
}

function printItemsByBrands(ipage, irows, bid, callback) {
  var id = bid;
  var select_items_sql = 'select id, bid, name, price, detail, notice, location ' +
    'from items i join items_photos ip on (i.id = ip.iid) ' +
    'where bid = ? ' +
    'limit ?, ? ';
  var item_count_sql = 'select count(*) as cnt from items where bid = ?';

  var rowcnt = irows;
  var offset = (ipage - 1) * rowcnt;
  var msg = '';
  var count = 0;
  //TODO count媛 42�닿퀬 rowcnt * offset � �꾩옱 媛쒖닔.

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    conn.query(item_count_sql, [id], function (err, rows, fields) {
      logSql(this);
      if (err)
        return callback(err);

      count = rows[0].cnt;
      conn.query(select_items_sql, [id, offset, rowcnt], function (err, rows, fields) {
        logSql(this);
        conn.release();
        if (err)
          return callback(err);

        if (count > irows * ipage) {
          msg = 'https://ec2-52-78-52-228.ap-northeast-2.compute.amazonaws.com/brands/' + id + '?page=' + (ipage + 1) + '&rows=' + irows;
         // msg = 'https://localhost:3443/brands/' + id + '?page=' + (ipage + 1) + '&rows=' + irows;
          callback(null, rows, msg);
        } else {
          msg = '마지막 페이지 입니다.';
          callback(null, rows, msg);
        }
      });
    });
  });
}


module.exports.printBrands = printBrands;
module.exports.printItemsByBrands = printItemsByBrands;

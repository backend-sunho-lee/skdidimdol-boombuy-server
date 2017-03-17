var mysql = require('mysql');
var async = require('async');
var logger = require('../common/logger');
var logSql = require('../common/logging').logSql;
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

// TODO 14번 주문 등록하는 makeOrder 함수 만들기
function makeOrder(order, callback) {
  // 1. orders, settlements, carts INSERT SQL문 작성
  var insert_order = 'insert into orders(receiver) ' +
    'values (?)';
  var insert_senders = 'insert into settlements(oid, sender, cost, num) ' +
    'values (?, ?, ?, ?)';
  var insert_items = 'insert into carts(oid, iid) ' +
    'values (?, ?)';

  var select_senders = 'select phone from users where phone = ?';

  var sql_select_orders = 'select id as oid, state, date(orderstime) as date, receiver, name, location ' +
    'from orders o join (select phone, ' +
    '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                           location ' +
    '                    from users u join users_photos up on (u.id = up.uid)) t on (o.receiver = t.phone) ' +
    'where id = ?';
  var sql_select_settlements = 'select oid, name, num, location ' +
    'from settlements s join (select phone, ' +
    '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                                location ' +
    '                         from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
    'where oid = ?';

  var num = 0;
  var sentOrders = {};

  // 2. dbPool.getConnection으로 conn 얻기
  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    // 5. insertOrder 함수 코드 작성
    function insertOrder(nextCallback) {
      conn.query(insert_order, [order.receiver], function (err, result) {
        logSql(this);
        if (err)
          return nextCallback(err);

        var oid = result.insertId;
        nextCallback(null, oid, order.senders, order.carts);
      });
    }

    // 6. insertSenders 함수 코드 작성
    function insertSenders(oid, senders, carts, nextCallback) {
      async.eachSeries(senders, function (sender, nextItemCallback) {
        var phone = sender.phone;
        var cost = sender.cost;
        num += 1;

        conn.query(select_senders,[phone], function (err, rows, fields) {
          logSql(this);
          if (err)
            return nextItemCallback(err);
          if (rows.length === 0 ) {
            err = new Error("보내는 상대방의 폰 번호가 없습니다.");
            return nextItemCallback(err);
          }
          conn.query(insert_senders, [oid, phone, cost, num], function (err, result) {
            logSql(this);
            if (err)
              return nextItemCallback(err);

            nextItemCallback(null);
          });
        });
      }, function (err) {
        if (err) {
          err = new Error("Insert 오류.");
          return nextCallback(err);
        }
        nextCallback(null, oid, carts);
      });
    }

    // 7. insertItems 함수 코드 작성
    function insertItems(oid, carts, nextCallback) {
      async.each(carts, function (cart, nextItemCallback) {
        var iid = cart;

        conn.query(insert_items, [oid, iid], function (err) {
          logSql(this);
          if (err)
            return nextItemCallback(err);

          nextItemCallback(null);
        });
      }, function (err) {
        if (err) {
          err = new Error("Insert 오류.");
          return nextCallback(err);
        }

        nextCallback(null, oid);
      });
    }

    function findOrders(oid, nextCallback) {
      conn.query(sql_select_orders, [aes_key, oid], function (err, rows, fields) {
        logSql(this);
        if (err) {
          err = new Error("select 오류.");
          return nextCallback(err);
        }
        sentOrders.orders = rows;
        nextCallback(null, oid);
      });
    }

    function findSettlements(oid, nextCallback) {
      sentOrders.settlements = [];
      conn.query(sql_select_settlements, [aes_key, oid], function (err, rows, fields) {
        logSql(this);
        if (err) {
          err = new Error("select 오류.");
          return nextCallback(err);
        }

        sentOrders.aid = oid;
        sentOrders.settlements.push(rows);

        nextCallback(null, sentOrders);
      });
    }


    // 3. Trasaction 시작하기
    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return callback(err);
      }

      // 4. waterfall로 insertOrder, insertSenders, insertItems 실행해서 result 얻기
      async.waterfall([insertOrder, insertSenders, insertItems, findOrders, findSettlements], function (err, sentOrders) {
        if (err) {
          conn.rollback(function () {
            conn.release();
            return callback(err);
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              conn.rollback(function () {
                conn.release();
                return callback(err);
              });
            }
            conn.release();
            callback(null, sentOrders);
          });
        }
      });
    });
  });
}

// TODO 보낸 선물 목록 조회 --간략히
function printSendlist(uid, callback) {
  var sql_select_oids = 'select oid from settlements ' +
    'where sender = ? ' +
    'order by oid desc';
  var sql_select_orders = 'select s.oid, o.state, orderstime, t1.name as receiver, t1.location as receiverphoto, t2.name as sender, t2.location as senderphoto, cnt ' +
    'from orders o join settlements s on (s.oid = o.id) ' +
    '              join (select uid, phone, ' +
    '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                           location ' +
    '                    from users u join users_photos up on (u.id = up.uid)) t1 on (o.receiver = t1.phone) ' +
    '              join (select uid, phone, ' +
    '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                           location ' +
    '                    from users u join users_photos up on (u.id = up.uid)) t2 on (t2.phone = s.sender) ' +
    '              join (select oid as coid, count(*) - 1 as cnt from settlements where oid = ?) t3 on (t3.coid = o.id) ' +
    'where id = ? and num = 1';

  var sendlist = [];
  var ordernums = [];
  var i = 0;

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    function printOids(nextCallback) {
      conn.query(sql_select_oids, [uid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextCallback(err);

        for (var i = 0; i < rows.length; i++) {
          ordernums.push(rows[i].oid);
        }

        nextCallback(null, ordernums);  // rows는 oid 목록을 나타낸다.
      });
    }

    function findOrders(ordernums, nextCallback) {
      async.eachSeries(ordernums, function (oid, nextItemCallback) {
        conn.query(sql_select_orders, [aes_key, aes_key, oid, oid], function (err, rows, fields) {
          logSql(this);
          if (err)
            return nextItemCallback(err);

          sendlist.push(rows[0]);
          nextItemCallback(null);
        });
      }, function (err) {
        if (err)
          return nextCallback(err);

        nextCallback(null, sendlist);
      });
    }

    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return callback(err);
      }

      async.waterfall([printOids, findOrders], function (err, sendlist) {
        if (err) {
          conn.rollback(function () {
            conn.release();
            return callback(err);
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              conn.rollback(function () {
                conn.release();
                return callback(err);
              });
            }
            conn.release();
            callback(null, sendlist);
          });
        }
      });
    });
  });
}
/*// TODO 보낸 선물 목록 조회 -페이징처리, 간략히
 function printSendlist(ipage, irows, uid, callback) {
 var sql_count_oids = 'select count(*) as cnt from settlements where sender = ? ';
 var sql_select_oids = 'select oid from settlements ' +
 'where sender = ? ' +
 'order by oid desc ' +
 'limit ?, ?';
 var sql_select_orders = 'select s.oid, o.state, orderstime, t1.name as receiver, t1.location as receiverphoto, t2.name as sender, t2.location as senderphoto, cnt ' +
 'from orders o join settlements s on (s.oid = o.id) ' +
 '              join (select uid, phone, ' +
 '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                           location ' +
 '                    from users u join users_photos up on (u.id = up.uid)) t1 on (o.receiver = t1.phone) ' +
 '              join (select uid, phone, ' +
 '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                           location ' +
 '                    from users u join users_photos up on (u.id = up.uid)) t2 on (t2.phone = s.sender) ' +
 '              join (select oid as coid, count(*) - 1 as cnt from settlements where oid = ?) t3 on (t3.coid = o.id) ' +
 'where id = ? and num = 1';

 var sendlist = [];
 var ordernums = [];
 var i = 0;

 var rowcnt = irows;
 var offset = (ipage - 1) * rowcnt;
 var msg = '';
 var count = 0;

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function printOids(nextCallback) {
 conn.query(sql_count_oids, [uid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 count = rows[0].cnt;
 if (count == 0) {
 msg = '보낸 선물이 없습니다.';
 nextCallback(null, ordernums, msg);
 } else {
 conn.query(sql_select_oids, [uid, offset, rowcnt], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);


 for (var i = 0; i < rows.length; i++) {
 ordernums.push(rows[i].oid);
 }

 if (count > irows * ipage) {
 msg = 'https://ec2-52-78-52-228.ap-northeast-2.compute.amazonaws.com/orders/send?page=' + (ipage + 1) + '&rows=' + irows;
 //msg = 'https://localhost:3443/orders/send?page=' + (ipage + 1) + '&rows=' + irows;
 nextCallback(null, ordernums, msg);
 } else {
 msg = '마지막 페이지 입니다.';
 nextCallback(null, ordernums, msg);
 }
 });
 }
 });
 }

 function findOrders(ordernums, msg, nextCallback) {
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_orders, [aes_key, aes_key, oid, oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 sendlist.push(rows[0]);
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, sendlist, msg);
 });
 }

 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 async.waterfall([printOids, findOrders], function (err, sendlist, msg) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 }
 conn.release();
 callback(null, sendlist, msg);
 });
 }
 });
 });
 });
 }*/

// TODO 보낸 선물 정보 조회
function printSentGift(oid, uid, callback) {
  var sql_select_oids = 'select oid from settlements where sender = ? and oid = ? ';
  var sql_select_orders = 'select s.oid, o.state, orderstime, t1.name as receiver, t1.location as receiverphoto, t2.name as sender, t2.location as senderphoto, cnt ' +
    'from orders o join settlements s on (s.oid = o.id) ' +
    '              join (select uid, phone, ' +
    '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                           location ' +
    '                    from users u join users_photos up on (u.id = up.uid)) t1 on (o.receiver = t1.phone) ' +
    '              join (select uid, phone, ' +
    '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                           location ' +
    '                    from users u join users_photos up on (u.id = up.uid)) t2 on (t2.phone = s.sender) ' +
    '              join (select oid as coid, count(*) - 1 as cnt from settlements where oid = ?) t3 on (t3.coid = o.id) ' +
    'where id = ? and num = 1';
  var sql_select_settlements = 'select oid, sender, name, cost, state, location ' +
    'from settlements s join (select uid, phone, ' +
    '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                                location ' +
    '                         from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
    'where oid = ? ' +
    'order by num ';
  var sql_select_carts = 'select oid, iid, name, price, location ' +
    'from carts c join (select id, name, price, detail, notice, location ' +
    '                   from items i join items_photos ip on (ip.iid = i.id)) t on (t.id = c.iid) ' +
    'where oid = ?';

  var sentOrders = {};

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    function findOrders(nextCallback) {
      sentOrders.orders = [];
      conn.query(sql_select_oids, [uid, oid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextCallback(err);

        if (rows.length === 0) {
          err = new Error('');
          return nextCallback(err);
        }

        conn.query(sql_select_orders, [aes_key, aes_key, oid, oid], function (err, rows, fields) {
          logSql(this);
          if (err)
            return nextCallback(err);

          sentOrders.orders = rows[0];
          nextCallback(null, sentOrders);
        });
      });
    }

    function findSettlements(sentOrders, nextCallback) {
      sentOrders.settlements = [];
      conn.query(sql_select_settlements, [aes_key, oid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextCallback(err);

        sentOrders.settlements = rows;
        nextCallback(null, sentOrders);
      });
    }

    function findCarts(sentOrders, nextCallback) {
      sentOrders.carts = [];
      conn.query(sql_select_carts, [oid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextCallback(err);

        sentOrders.carts = rows;
        nextCallback(null, sentOrders);
      });
    }


    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return callback(err);
      }

      async.waterfall([findOrders, findSettlements, findCarts], function (err, sentOrders) {
        if (err) {
          conn.rollback(function () {
            conn.release();
            return callback(err);
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              conn.rollback(function () {
                conn.release();
                return callback(err);
              });
            }
            conn.release();
            callback(null, sentOrders);
          });
        }
      });
    });
  });
}

// TODO 받은 선물 목록 조회
function printReceivedGift(phone, callback) {
  var sql_count_oids = 'select count(*) as cnt from orders where receiver = ?  ';
  var sql_select_oids = 'select id from orders ' +
    'where receiver = ? ' +
    'and state = 2 ' +    // 주문이 완료된 것만 출력되도록
    'order by id desc';
  var sql_select_orders = 'select s.oid as oid, time, ' +
    '       senders, t2.location, ' +
    '       c.iid as iid, i.name as item_name, ip.location as item_photo ' +
    'from settlements s join carts c on (c.oid = s.oid) ' +
    '                   join items i on (i.id = c.iid) ' +
    '                   join items_photos ip on (ip.iid = c.iid) ' +
    '                   join (select oid as moid, max(date_format(settlementstime, "%Y-%m-%d")) as time from settlements ' +
    '                         where oid = ?) t3 on (t3.moid = s.oid) ' +
    '                   join (select oid as uoid, num, ' +
    '                                @prev_name := concat(@prev_name, \' \', cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45))) as senders ' +
    '                         from users u join settlements s on (s.sender = u.phone) ' +
    '                   join (select @prev_name := \'\') t2 ' +
    '                         where oid = ? ' +
    '                         order by CHAR_LENGTH(senders) desc limit 1) t1 on (t1.uoid = s.oid) ' +
    '                   join (select oid as upoid, uid, phone, location ' +
    '                         from users u join users_photos up on (u.id = up.uid) ' +
    '                                      join settlements s on (s.sender = u.phone) ' +
    '                         where num = 1 and oid = ?) t2 on (t2.upoid = s.oid) ' +
    'where s.oid = ?  group by c.iid';
  var orderlists = [];
  var ordernums = [];

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    function printOids(nextCallback) {
      conn.query(sql_select_oids, [phone], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextCallback(err);

        for (var i = 0; i < rows.length; i++) {
          ordernums.push(rows[i].id);
        }

        nextCallback(null, ordernums);
      });
    }

    function findOrders(ordernums, nextCallback) {
      async.eachSeries(ordernums, function (oid, nextItemCallback) {
        conn.query(sql_select_orders, [oid, aes_key, oid, oid, oid], function (err, rows, fields) {
          logSql(this);
          if (err)
            return nextItemCallback(err);

          for (var i in rows)
            orderlists.push(rows[i]);

          nextItemCallback(null);
        });
      }, function (err) {
        if (err)
          return nextCallback(err);

        nextCallback(null, orderlists);
      });
    }


    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return callback(err);
      }
      async.waterfall([printOids, findOrders], function (err, orderlists) {
        if (err) {
          conn.rollback(function () {
            conn.release();
            return callback(err);
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              conn.rollback(function () {
                conn.release();
                return callback(err);
              });
            }
            conn.release();
            callback(null, orderlists);
          });
        }
      });
    });
  });
}
/*
 // TODO 받은 선물 목록 조회 -페이징처리
 function printReceivedGift(ipage, irows, phone, callback) {
 var sql_count_oids = 'select count(*) as cnt from orders where receiver = ?  ';
 var sql_select_oids = 'select id from orders ' +
 'where receiver = ? ' +
 'and state = 2 ' +    // 주문이 완료된 것만 출력되도록
 'order by id desc ' +
 'limit ?, ? ';
 var sql_select_settlements = 'select oid, name, location, time ' +
 'from settlements s join (select uid, phone, ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '  location ' +
 'from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
 'join (select oid as moid, max(settlementstime) as time from settlements ' +
 'where oid = ?) t2 on (t2.moid = s.oid) ' +
 'where oid = ? and num = 1 ' +
 'union all ' +
 'select oid, name, \'\', \'\' ' +
 'from settlements s join (select uid, phone, ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name ' +
 'from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
 'where oid = ? and num != 1';
 var sql_select_carts = 'select oid, iid, name, location ' +
 'from carts c join (select id, name, price, detail, notice, location ' +
 '                   from items i join items_photos ip on (ip.iid = i.id)) t on (t.id = c.iid) ' +
 'where oid = ?';
 var orderlists = {};
 var ordernums = [];

 var rowcnt = irows;
 var offset = (ipage - 1) * rowcnt;
 var msg = '';
 var count = 0;

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function printOids(nextCallback) {
 conn.query(sql_count_oids, [phone], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 count = rows[0].cnt;
 if (count == 0) {
 msg = '받은 선물이 없습니다.';
 nextCallback(null, ordernums, msg);
 } else {
 conn.query(sql_select_oids, [phone, offset, rowcnt], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 for (var i in rows) {
 ordernums.push(rows[i].id);
 }

 if (count > irows * ipage) {
 msg = 'https://ec2-52-78-52-228.ap-northeast-2.compute.amazonaws.com/orders/receive?page=' + (ipage + 1) + '&rows=' + irows;
 //msg = 'https://localhost:3443/orders/receive?page=' + (ipage + 1) + '&rows=' + irows;
 nextCallback(null, ordernums, msg);
 } else {
 msg = '마지막 페이지 입니다.';
 nextCallback(null, ordernums, msg);
 }
 });
 }
 });
 }

 function findSettlements(ordernums, msg, nextCallback) {
 orderlists.settlements = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_settlements, [aes_key, oid, oid, aes_key, oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 //orderlists.settlements.push(rows);
 var name = '';
 for (var i in rows)
 name += rows[i].name + ' ';

 var table = {};
 table.oid = rows[0].oid;
 table.location = rows[0].location;
 table.time = rows[0].time;
 table.name = name;

 orderlists.settlements.push(table);
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, ordernums, msg);
 });
 }

 function findCarts(ordernums, msg, nextCallback) {
 orderlists.carts = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_carts, [oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 //orderlists.carts.push(rows);
 for (var i in rows)
 orderlists.carts.push(rows[i]);

 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, orderlists, msg);
 });
 }


 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }
 async.waterfall([printOids, findSettlements, findCarts], function (err, orderlists, msg) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 }
 conn.release();
 callback(null, orderlists, msg);
 });
 }
 });
 });
 });
 }
 */

//ToDO 18번 결제 상태 변경
function senderUpdate(oid, state, sender, callback) {
  var sql_update_sender = 'update settlements set state = ? where oid = ? and sender = ? ';
  var sql_count_sstate =  'select count(*) as cnt from settlements ' +
    'where oid = ? and state = 1';
  var sql_last_sender = 'select oid, num, sender, name, state, location ' +
    'from settlements s join (select uid, phone, ' +
    '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '                                location ' +
    '                         from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
    'where oid = ? and state = 1';
  var sql_update_ostate = 'update orders set state = 2 where id = ?';
  var msg = '';

  var sql_select_phone = 'select sender from settlements where oid = ?';
  var sql_select_sphone = 'select distinct(receiver) as rec from orders where id = ?';
  var phonebuckets = [];
  var phonebucketsforreceiver;

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    /*
     function selectPhoneForAlaram(nextCallback) {
     conn.query(sql_select_phones, [oid], function(err, rows, fields) {
     logsql(this);
     async.each(rows, function(row, nextItemCallback) {
     phoneBuckets.push(row.id)
     });
     if (err)
     return nextCallback(err);
     });
     }
     */

    function updateSenderState(nextCallback) {
      conn.query(sql_update_sender, [state, oid, sender], function (err, result) {
        logSql(this);
        if (err)
          return nextCallback(err);

        if (result.affectedRows === 0) {
          err = new Error('');
          return nextCallback(err);
        }

        conn.query(sql_select_phone, [oid], function (err, rows, fields) {
          async.eachSeries(rows, function (row, nextItemCallback) {
            if (err)
              return nextItemCallback(err);

            //  phonebuckets.push(row.sender);
            nextItemCallback(null);
          }, function (err) {
            if (err)
              return nextCallback(err);
          });

          conn.query(sql_select_sphone, [oid], function (err, rows, fields) {
            if (err)
              return nextCallback(err);

            phonebuckets.push(rows[0].rec);
          });

          nextCallback(null, phonebuckets);
        });
      });
    }

    function checkOrderstate(phonebuckets, nextCallback) {
      conn.query(sql_count_sstate, [oid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextCallback(err);

        if (rows[0].cnt == 1) {
          conn.query(sql_last_sender, [aes_key, oid], function (err, rows, fields) {
            logSql(this);
            if (err)
              return nextCallback(err);

            // 독촉 알림 보내기
            msg = ' 남은 결제 인원 1명, ' + rows[0].name + '님만 결제하면 주문이 완료됩니다.';
            nextCallback(null, msg, phonebuckets);
          });
        } else if (rows[0].cnt == 0) {
          conn.query(sql_update_ostate, [oid], function (err, result) {
            logSql(this);
            if (err)
              return nextCallback(err);

            // 주문 완료 알림 보내기: receiver, sender 각각에게 보내기
            msg = ' 주문이 완료되었습니다.';
            nextCallback(null, msg, phonebuckets);
          });
        } else {
          nextCallback(null, msg, phonebuckets);
        }
      })
    }

    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return callback(err);
      }
      async.waterfall([updateSenderState, checkOrderstate], function (err, msg, phonebuckets) {
        if (err) {
          conn.rollback(function () {
            conn.release();
            return callback(err);
          });
        } else {
          conn.commit(function (err) {
            if (err) {
              conn.rollback(function () {
                conn.release();
                return callback(err);
              });
            }
            conn.release();
            callback(null, msg, phonebuckets);
          });
        }
      });
    });
  });
}


module.exports.makeOrder = makeOrder;
module.exports.printSentGift = printSentGift;
module.exports.printReceivedGift = printReceivedGift;
module.exports.senderUpdate = senderUpdate;
module.exports.printSendlist = printSendlist;
//module.exports.settlement = settlement;

/*// TODO 14번 주문 등록하는 makeOrder 함수 만들기
 function makeOrder(order, callback) {
 // 1. orders, settlements, carts INSERT SQL문 작성
 var insert_order = 'insert into orders(receiver) ' +
 'values (?)';
 var insert_senders = 'insert into settlements(oid, sender, cost, num) ' +
 'values (?, ?, ?, ?)';
 var insert_items = 'insert into carts(oid, iid) ' +
 'values (?, ?)';

 var sql_select_orders = 'select id as oid, state, date(orderstime) as date, receiver, name, location ' +
 'from orders o join (select phone, ' +
 '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                           location ' +
 '                    from users u join users_photos up on (u.id = up.uid)) t on (o.receiver = t.phone) ' +
 'where id = ?';
 var sql_select_settlements = 'select oid, name, num, location ' +
 'from settlements s join (select phone, ' +
 '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                                location ' +
 '                         from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
 'where oid = ?';

 var num = 0;
 var sentOrders = {};

 // 2. dbPool.getConnection으로 conn 얻기
 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);


 // 5. insertOrder 함수 코드 작성
 function insertOrder(nextCallback) {
 conn.query(insert_order, [order.receiver], function (err, result) {
 if (err)
 return callback(err);

 var oid = result.insertId;
 logger.log('debug', 'makeOrder > insertOrder >> insertId: %d', result.insertId);
 nextCallback(null, oid, order.senders, order.carts);
 });
 }


 // 6. insertSenders 함수 코드 작성
 function insertSenders(oid, senders, carts, nextCallback) {
 async.eachSeries(senders, function (sender, nextItemCallback) {
 var phone = sender.phone;
 var cost = sender.cost;
 num += 1;

 conn.query(insert_senders, [oid, phone, cost, num], function (err) {
 if (err)
 return nextItemCallback(err);

 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, oid, carts);
 });
 }

 // 7. insertItems 함수 코드 작성
 function insertItems(oid, carts, nextCallback) {
 async.each(carts, function (cart, nextItemCallback) {
 var iid = cart;

 conn.query(insert_items, [oid, iid], function (err) {
 if (err)
 return nextItemCallback(err);

 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, oid);
 });
 }

 function findOrders(oid, nextCallback) {
 conn.query(sql_select_orders, [aes_key, oid], function (err, rows, fields) {
 if (err)
 return nextCallback(err);

 logger.log('debug', 'printSentGift > findOrders >> oid: %s, orders: %j', oid, rows);

 sentOrders.orders = rows;
 nextCallback(null, oid);
 });
 }

 function findSettlements(oid, nextCallback) {
 sentOrders.settlements = [];
 conn.query(sql_select_settlements, [aes_key, oid], function (err, rows, fields) {
 if (err)
 return nextCallback(err);
 logger.log('debug', 'printSentGift > findSettlements >> oid: %s, settlements: %j', oid, rows);

 sentOrders.settlements.push(rows);

 nextCallback(null, sentOrders);
 });
 }


 // 3. Trasaction 시작하기
 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 // 4. waterfall로 insertOrder, insertSenders, insertItems 실행해서 result 얻기
 async.waterfall([insertOrder, insertSenders, insertItems, findOrders, findSettlements], function (err, sentOrders) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 }
 conn.release();
 callback(null, sentOrders);
 });
 }
 });
 });
 });
 }*/
/*// TODO 16번 받은 선물 조회 -페이징처리된거
 function printReceivedGift(info, callback) {
 var sql_oid_count = 'select count(*) as cnt from orders ' +
 'where receiver = ?';
 var sql_select_oids = 'select id from orders ' +
 'where receiver = ? ' +
 'limit ?, ?';
 var sql_select_settlements = 'select oid, num, sender, name, location ' +
 'from settlements s join (select uid, ' +
 '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                                location ' +
 '                         from users u join users_photos up on (u.id = up.uid)) t on (t.uid = s.sender) ' +
 'where oid = ?';
 var sql_select_carts = 'select oid, iid, name, price, location ' +
 'from carts c join (select id, name, price, detail, notice, location ' +
 '                   from items i join items_photos ip on (ip.iid = i.id)) t on (t.id = c.iid) ' +
 'where oid = ?';
 var orderlists = {};
 var ordernums = [];

 var rowcnt = info.rows;
 var offset = (info.page - 1) * rowcnt;
 var msg = '';
 var cnt = 0;
 var num = 0;

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function printOids(nextCallback) {
 conn.query(sql_oid_count, [info.uid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 cnt = parseInt(rows[0].cnt);
 logger.log('debug', 'printSentGift > printOids >> innerCnt: %d', cnt);

 if (cnt === 0) {
 return nextCallback(null, null, null);
 } else {
 conn.query(sql_select_oids, [info.uid, offset, rowcnt], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 logger.log('debug', 'printSentGift > printOids >> uid: %s, rows: %j', info.uid, rows);

 for (var i = 0; i < rows.length; i++) {
 ordernums.push(rows[i].id);
 }
 orderlists.ordernums = ordernums;

 logger.log('debug', 'printSentGift > printOids >> ordernums: %j', ordernums);

 if (cnt > info.page * info.rows) {
 msg = '다음 페이지가 있습니다.:  ' + 'https://localhost:3443/orders/send?page=' + (info.page + 1) + '&rows=' + info.rows;
 nextCallback(null, msg, ordernums);  // rows는 oid 목록을 나타낸다.
 } else {
 msg = '다음 페이지가 없습니다';
 nextCallback(null, msg, ordernums);
 }
 });
 }
 });
 }

 function findSettlements(msg, ordernums, nextCallback) {
 if (cnt == 0) {
 nextCallback(null, null, null);
 } else {
 orderlists.settlements = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_settlements, [aes_key, oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);
 logger.log('debug', 'printSentGift > findSettlements >> oid: %s, settlements: %j', oid, rows);

 orderlists.settlements.push(rows);
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, msg, ordernums);
 });
 }
 }

 function findCarts(msg, ordernums, nextCallback) {
 if (cnt == 0) {
 nextCallback(null, null, null);
 } else {
 orderlists.carts = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_carts, [oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 orderlists.carts.push(rows);

 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, msg, orderlists);
 });
 }
 }


 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 async.waterfall([printOids, findSettlements, findCarts], function (err, msg, orderlists) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 }
 conn.release();
 callback(null, msg, orderlists);
 });
 }
 });
 });
 });
 }*/
/*//TODO 17 결제 완료
 function settlement(oid, callback) {

 var sql_select_settlement = 'select oid, sender, cost, s.state as sstate from settlements s join orders o on (o.id = s.oid) where oid = ?';

 var sql_update_order = 'update orders set state = ? where id = ? ';

 var flag = 0;

 var msg = '';
 dbPool.getConnection(function (err, conn) {
 if (err)
 callback(err);

 function selectSettlement(updateFunc, flagFunc) {
 conn.query(sql_select_settlement, [oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return callback(err);

 updateFunc(rows, flagFunc);
 });
 }


 function updateOrders(sums, flagFunc) {

 for (var a in sums) {
 console.log('aaaaa');
 if (sums[a].sstate === '대기') {
 flag = 1;
 conn.query(sql_update_order, ['진행중', oid], function (err, result) {
 logSql(this);
 conn.release();

 msg = '결제가 안된 친구가 있습니다. (주문 완료x)';
 return callback(null, msg);


 });
 }
 }

 flagFunc(flag);
 }

 function checkFlag(flag) {
 var flag2 = flag;

 if (flag2 === 0) {
 conn.query(sql_update_order, ['2', oid], function (err, result) {
 logSql(this);
 conn.release();
 if (err)
 callback(err);
 });

 msg = '결제가 완료 되었습니다.';
 callback(null, msg);

 }

 }

 selectSettlement(updateOrders, checkFlag);

 });
 }*/
/*
 // TODO 받은 선물 목록 조회
 function printReceivedGift(phone, callback) {
 var sql_select_oids = 'select id from orders ' +
 'where receiver = ? ';
 var sql_select_settlements = 'select oid, num, sender, name ' +
 'from settlements s join (select uid, phone, ' +
 '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                                location ' +
 '                         from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
 'where oid = ?';
 var sql_select_carts = 'select oid, iid, name, price, location ' +
 'from carts c join (select id, name, price, detail, notice, location ' +
 '                   from items i join items_photos ip on (ip.iid = i.id)) t on (t.id = c.iid) ' +
 'where oid = ?';
 var orderlists = {};
 var ordernums = [];

 var msg = '';
 var cnt = 0;
 var num = 0;

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function printOids(nextCallback) {
 conn.query(sql_select_oids, [phone], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 for (var i = 0; i < rows.length; i++) {
 ordernums.push(rows[i].id);
 }
 orderlists.ordernums = ordernums;
 nextCallback(null, ordernums);
 });
 }

 function findSettlements(ordernums, nextCallback) {
 orderlists.settlements = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_settlements, [aes_key, oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 orderlists.settlements.push(rows);
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, ordernums);
 });
 }

 function findCarts(ordernums, nextCallback) {
 orderlists.carts = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_carts, [oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 orderlists.carts.push(rows);

 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, orderlists);
 });
 }


 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 async.waterfall([printOids, findSettlements, findCarts], function (err, orderlists) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 }
 conn.release();
 callback(null, orderlists);
 });
 }
 });
 });
 });
 }*/
/*// TODO 보낸 선물 목록 조회
 function printSendlist(uid, callback) {
 var sql_select_oids = 'select oid from settlements ' +
 'where sender = ? ';
 var sql_select_orders = 'select id as oid, state, date(orderstime) as date, receiver, name, location ' +
 'from orders o join (select uid, phone, ' +
 '                           cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                           location ' +
 '                    from users u join users_photos up on (u.id = up.uid)) t on (o.receiver = t.phone) ' +
 'where id = ?';
 var sql_select_settlements = 'select oid, num, sender, name, cost, state, location ' +
 'from settlements s join (select uid, phone, ' +
 '                                cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
 '                                location ' +
 '                         from users u join users_photos up on (u.id = up.uid)) t on (t.phone = s.sender) ' +
 'where oid = ?';

 var sentOrders = {};
 var ordernums = [];

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function printOids(nextCallback) {
 conn.query(sql_select_oids, [uid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextCallback(err);

 for (var i = 0; i < rows.length; i++) {
 ordernums.push(rows[i].oid);
 }

 nextCallback(null, ordernums);  // rows는 oid 목록을 나타낸다.
 });
 }

 function findOrders(ordernums, nextCallback) {
 sentOrders.orders = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_orders, [aes_key, oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 sentOrders.orders.push(rows);
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, ordernums);
 });
 }

 function findSettlements(ordernums, nextCallback) {
 sentOrders.settlements = [];
 async.eachSeries(ordernums, function (oid, nextItemCallback) {
 conn.query(sql_select_settlements, [aes_key, oid], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextItemCallback(err);

 sentOrders.settlements.push(rows);
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextCallback(err);

 nextCallback(null, ordernums, sentOrders);
 });
 }

 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 async.waterfall([printOids, findOrders, findSettlements], function (err, ordernums, sentOrders) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 return callback(err);
 });
 }
 conn.release();
 callback(null, ordernums, sentOrders);
 });
 }
 });
 });
 });
 }*/
/*// 주문 상태 변경 _사용X
 function settlement(oid, callback) {
 var sql_select_settlement = 'select oid, sender, cost, s.state as sstate from settlements s join orders o on (o.id = s.oid) where oid = ?';

 var sql_update_order = 'update orders set state = ? where id = ? ';

 var flag = 0;

 var msg = '';
 dbPool.getConnection(function (err, conn) {
 if (err)
 callback(err);

 function selectSettlement(updateFunc, flagFunc) {
 conn.query(sql_select_settlement, [oid], function (err, rows, fields) {
 if (err)
 return callback(err);

 updateFunc(rows, flagFunc);
 });
 }


 function updateOrders(sums, flagFunc) {

 for (var a in sums) {
 console.log('aaaaa');
 if (sums[a].sstate === '�湲�') {
 flag = 1;
 conn.query(sql_update_order, ['吏꾪뻾以�', oid], function (err, result) {
 conn.release();

 msg = '寃곗젣媛 �덈맂 移쒓뎄媛 �덉뒿�덈떎. (二쇰Ц �꾨즺x)';
 return callback(null, msg);


 });
 }
 }

 flagFunc(flag);
 }

 function checkFlag(flag) {
 var flag2 = flag;

 if (flag2 === 0) {
 conn.query(sql_update_order, ['�꾨즺', oid], function (err, result) {
 conn.release();
 if (err)
 callback(err);
 });

 msg = '寃곗젣媛 �꾨즺 �섏뿀�듬땲��.';
 callback(null, msg);

 }

 }

 selectSettlement(updateOrders, checkFlag);

 });
 }*/

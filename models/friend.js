var mysql = require('mysql');
var async = require('async');
var dbPool = require('../common/dbpool').dbPool;
var logger = require('../common/logger');
var logSql = require('../common/logging').logSql;
var aes_key = require('../config/key').aes_key;
var fs = require('fs');
var AWS = require('aws-sdk');
var s3Config = require('../config/aws_s3');
var S3 = new AWS.S3({   // s3 client 객체 생성 -네트워크 기능 가지고 있다
  region: 'ap-northeast-2',
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey
});


// 친구 목록 맵핑(업데이트) -입력된 값에 없으면 삭제하기 추가
function mappingUpdate(phoneFriends, uid, callback) {
  //var sql_select_friends = 'SELECT id, phone FROM users u join friends f on (u.id = f.uid)';
  var sql_delete_friends = 'delete from friends where uid = ?';

  var sql_insert_friends = 'insert into friends(fuid, uid) values(?, ?)';

  var sql_select_friends = 'select fuid from friends where uid = ? and fuid = ?';

  var sql_select_users = 'select id, phone, ' +
    'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name ' +
    'from users ' +
    'where phone = ?';

  dbPool.getConnection(function (err, conn) {
    if (err)
      return callback(err);

    function deleteFriends(nextTaskCallback) {
      conn.query(sql_delete_friends, [uid], function (err, result) {
        logSql(this);
        if (err)
          return nextTaskCallback(err);

        nextTaskCallback(null, phoneFriends);
      });
    }

    function selectUsers(phoneFriends, nextTaskCallback) {    // 입력받은 목록중에 회원인 사람을 걸러낸다
      var idnames = [];
      var cnt = 0;

      async.each(phoneFriends, function (phone, nextItemCallback) {
        conn.query(sql_select_users, [aes_key, phone], function (err, rows, fields) {
          logSql(this);
          if (err)
            return nextTaskCallback(err);
          logger.log('debug', 'mappingUpdate > selectUsers >> cnt: %d, rows: %j', cnt, rows);

          if(!rows.length) {
            nextItemCallback(null);
          } else {
            cnt++;
            idnames.push(rows[0].id);
            nextItemCallback(null);
          }
        });
      }, function (err) {
        if (err)
          return nextTaskCallback(err);

        nextTaskCallback(null, idnames);
      });
    }

    // 현재 저장된 친구 목록과 입력된 값을 비교하여 친구 목록에 없는 사람을 추가한다.
    function selectFriendsForUpdate(ids, nextTaskCallback) {
      async.each(ids, function (id, nextItemCallback) {
        conn.query(sql_select_friends, [uid, id], function (err, rows, fields) {
          logSql(this);
          if (err)
            return nextTaskCallback(err);

          if(!rows.fuid) {
            conn.query(sql_insert_friends, [id, uid], function (err, result) {
              logSql(this);
              if (err)
                return nextTaskCallback(err);
            });
          }
          nextItemCallback(null);
        });
      }, function (err) {
        if (err)
          return nextTaskCallback(err);

        nextTaskCallback(null, ids);
      });
    }

    conn.beginTransaction(function (err) {
      if (err) {
        conn.release();
        return callback(err);
      }

      async.waterfall([deleteFriends, selectUsers, selectFriendsForUpdate], function (err, ids) {
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
            callback(null, ids);
          });
        }
      });
    });
  });
}

//친구 목록 출력
function mappedFriendsPrint(uid, callback) {
  var sql_select_friends = 'select uid, phone, ' +
    'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
    '  location ' +
    'from users u join users_photos up on (u.id = up.uid) ' +
    'join (select fuid from friends where uid = ?) t on (t.fuid = u.id) ';
  var sql_count_friends = 'select count(uid) as cnt2 from friends where uid = ?';
  var members = [];
  var cnt3;

  dbPool.getConnection(function(err, conn) {
    if (err)
      return callback(err);

    function selectFriends(nextTaskCallback) {
      conn.query(sql_select_friends, [aes_key, uid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextTaskCallback(err);

        // async.each(rows, function (row, nextItemCallback) {
        //
        //     members.push({id: row.fid, phone: row.phone});
        //     nextItemCallback(null);
        //
        // });
        members = rows;
        nextTaskCallback(null, members);
      });
    }

    function countFriends(members, nextTaskCallback) {

      conn.query(sql_count_friends, [uid], function (err, rows, fields) {
        logSql(this);
        if (err)
          return nextTaskCallback(err);

        cnt3 = rows[0].cnt2;
        nextTaskCallback(null, members, cnt3);

      });
    }

    async.waterfall([selectFriends, countFriends], function (err, members, cnt3) {

      if (err) {
        conn.rollback(function () {
          conn.release();
          callback(err);
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
          callback(null, members, cnt3);
        });
      }
    });
  });
}
/*//친구 목록 출력 -페이징처리
function mappedFriendsPrint(ipage, irows, uid, callback) {
  var sql_select_friends = 'select uid, phone, ' +
                           '       cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(45)) as name, ' +
                           '       location ' +
                           'from users u join users_photos up on (u.id = up.uid) ' +
                           '             join (select fuid from friends where uid = ?) t on (t.fuid = u.id) ' +
                           'limit ?, ? ' ;
  var sql_count_friends = 'select count(uid) as cnt2 from friends where uid = ?';

  var rowcnt = irows;
  var offset = (ipage - 1) * rowcnt;
  var msg = '';
  var count = 0;

  dbPool.getConnection(function(err, conn) {
    if (err)
      return callback(err);

    conn.query(sql_count_friends, [uid], function (err, rows, fields) {
      logSql(this);
      if (err)
        return callback(err);

      count = rows[0].cnt2;
      conn.query(sql_select_friends, [aes_key, uid, offset, rowcnt], function (err, rows, fields) {
        logSql(this);
        conn.release();
        if (err)
          return callback(err);

        if (count > irows * ipage) {
          //msg = 'https://ec2-52-78-52-228.ap-northeast-2.compute.amazonaws.com/friends?page=' + (ipage + 1) + '&rows=' + irows;
          msg = 'https://localhost:3443/friends?page=' + (ipage + 1) + '&rows=' + irows;
          callback(null, rows, msg);
        } else {
          msg = '다음 페이지가 없습니다.';
          callback(null, rows, msg);
        }
      });
    });
  });
}*/

module.exports.mappedFriendsPrint = mappedFriendsPrint;
module.exports.mappingUpdate = mappingUpdate;
//module.exports.mappingFriend = mappingFriend;
/*
 //친구 목록 맵핑 (추가)
 function mappingFriend(phoneFriend, uid , callback) {
 var idnames = [];

 var sql_select_users = 'select id, phone, ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name ' +
 'from users ' +
 'where phone = ?';
 var sql_insert_friend = 'insert into friends (fuid, uid) values (?, ?)';
 var sql_select_friends = 'select * from users where id = any(select fuid from friends where fuid = ? )';

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function selectUsers(nextCallback) {
 var phoneBucket = phoneFriend;
 var cnt = 0;
 async.each(phoneBucket, function (phone2, nextItemCallback) {

 conn.query(sql_select_users, [aes_key, phone2], function (err, rows, fields) {
 if (err)
 return nextItemCallback(err);

 nextItemCallback(null);
 cnt++;
 idnames.push(rows[0].id);

 console.log(idnames + ' ' + cnt + ' ' + phoneBucket.length + ' vlaues');

 if (cnt === phoneBucket.length - 2) {
 console.log(idnames + 'valuessss');
 nextCallback(null, idnames);
 }
 });
 });
 }


 function insertUsers(idnames, nextCallback) {
 async.each(idnames, function (ids, nextItemCallback) {
 conn.query(sql_insert_friend, [ids, uid], function (err, result) {
 if (err)
 return nextItemCallback(err);

 nextItemCallback(null);

 });

 });
 nextCallback(null, idnames);
 }

 function selectFriends(idnames, nextCallback) {
 var cnt2 = 0;
 var mUsers = [];
 async.each(idnames, function (ids, nextItemCallback) {
 conn.query(sql_select_friends, [ids], function (err, rows, fields) {
 if (err)
 return nextItemCallback(err);

 nextItemCallback(null);

 cnt2++;

 mUsers.push({
 id: rows[0].fid,
 phone: rows[0].phone,
 name: rows[0].name
 });


 if (cnt2 === idnames.length - 2) {
 console.log(idnames + '' + mUsers + 'valuesss2222s');
 nextCallback(null, mUsers);
 }

 });
 });


 }

 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 async.waterfall([selectUsers, insertUsers, selectFriends], function (err, mUsers) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 callback(err);
 });
 } else {
 conn.commit(function (err) {
 if (err) {
 conn.rollback(function () {
 conn.release();
 callback(err);
 });
 }
 conn.release();
 callback(null, mUsers);
 });
 }
 });
 });

 });

 }
 */
/*// 친구 목록 맵핑(업데이트)
 function mappingUpdate(phoneFriends, uid, callback) {
 var sql_select_friends = 'SELECT id, phone FROM users u join friends f on (u.id = f.uid)';

 var sql_delete_friends = 'delete from friends where uid = ?';

 var sql_inser_friends = 'insert into friends(fuid, uid) values(?, ?)';

 var sql_select_users2 = 'select fuid from friends where uid = ? and fuid = ?';

 var sql_select_users = 'select id, phone, ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name ' +
 'from users ' +
 'where phone = ?';

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function selectUsers(nextTaskCallback) {
 var idnames = [];
 var cnt = 0;

 async.each(phoneFriends, function (phone, nextItemCallback) {
 conn.query(sql_select_users, [aes_key, phone], function (err, rows, fields) {
 logSql(this);
 if (err)
 return nextTaskCallback(err);
 logger.log('debug', 'mappingUpdate > selectUsers >> cnt: %d, rows: %j', cnt, rows);

 if(!rows.length) {
 nextItemCallback(null);
 } else {
 cnt++;
 idnames.push(rows[0].id);
 nextItemCallback(null);
 }

 if (cnt === phoneFriends.length) {

 nextTaskCallback(null, idnames);
 }
 });
 }, function (err) {
 if (err)
 return nextTaskCallback(err);

 nextTaskCallback(null, idnames);
 });
 }

 function selectFriendsForUpdate(ids, nextTaskCallback) {
 logger.log('debug', 'mappingUpdate > selectFriends~ >> ids: %j', ids);
 async.each(ids, function (id, nextItemCallback) {
 conn.query(sql_select_users2, [uid, id], function (err, rows, fields) {
 if (err)
 return nextTaskCallback(err);

 if(!rows.fuid) {
 console.log(id +'****'+ uid + '333333333333333');
 conn.query(sql_inser_friends, [id, uid], function (err, result) {
 console.log(id +'****'+ uid + '4444444444');
 if (err)
 return nextTaskCallback(err);
 });
 }
 nextItemCallback(null);
 });
 }, function (err) {
 if (err)
 return nextTaskCallback(err);

 nextTaskCallback(null, ids);
 });
 }

 conn.beginTransaction(function (err) {
 if (err) {
 conn.release();
 return callback(err);
 }

 async.waterfall([selectUsers, selectFriendsForUpdate], function (err, ids) {
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
 callback(null, ids);
 });
 }
 });
 });
 });
 }*/
/*
 function mappingUpdate(phoneFriends, callback) {

 var phoneBucket2 = phoneFriends;

 var sql_select_friends = 'SELECT id, phone FROM users u join friends f on (u.id = f.uid)';

 var sql_delete_friends = 'delete from friends where uid = ?';

 var sql_update_friends = 'insert into friends(uid) values(?)';

 var idnames = [];

 var sql_select_users = 'select id, phone, ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name ' +
 'from users ' +
 'where phone = ?';


 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 function selectUsers(phoneBucket2, selFunc, delFunc, updateFunc) {
 var cnt = 0;
 async.each(phoneBucket2, function (phone2, nextItemCallback) {

 conn.query(sql_select_users, [aes_key, phone2], function (err, rows, fields) {

 if (err)
 return nextItemCallback(err);

 nextItemCallback(null);
 cnt++;
 idnames.push(rows[0].phone);

 console.log(idnames + ' ' + cnt + ' ' + phoneBucket2.length + ' vlaues');

 if (cnt === phoneBucket2.length) {
 console.log(idnames + 'valuessss');

 selFunc(idnames, delFunc, updateFunc);
 }
 });
 });
 }


 function selectFriendsForUpdate(phones, delFunc, updateFunc) {
 var delBucket = [];
 var insBucket = [];
 var beforeVal= '';
 var phonebuck = phones;

 //TODO 불러온 전화번호부 목록, 데이터베이스 목록 맵핑한 결과 가져와서 번호가 똑같은게 있으면 그냥 넘어가고, 없으면 넣어준다.

 //TODO 1 새롭게 불러온 PhoneBucket도 맵핑 시켜줘야됨 .Users 랑

 conn.query(sql_select_friends, [], function (err, rows, fields) {
 async.each(rows, function (row, nextItemCallback) {
 async.each(phonebuck, function (phone, nextItemCallback) {

 console.log('beforeVal : ' + beforeVal + 'phone :' + phone + 'row.phone : ' + row.phone + 'row.id :' + row.id);

 if (beforeVal !== row.phone) {
 console.log(phone +' * ' + beforeVal + ' * ' + row.phone );
 insBucket.push(row.id);
 }



 if (beforeVal === phone) {

 console.log( beforeVal, phone +'*****11111');

 if (flag === 2) {
 insBucket.push(row.id);
 flag = 1;
 }
 } else {
 console.log( beforeVal, phone +'****2222222' + row.phone);
 insBucket.push(row.id);

 if (flag === 1)
 {
 insBucket.pop();
 flag = 0;
 }
 }
 if (phone === row.phone) { //
 console.log(insBucket + 'result ');
 console.log(phone + ' del ' + row.phone);
 insBucket.pop();
 console.log(insBucket + 'result2 ');


 //flag = 1;
 // delBucket.push(row.id);
 }

 else {
 console.log(phone + ' inst ' + row.phone + ' ggg'+ row.id);

 if (flag === 1) {

 insBucket.push(row.id);
 flag = 0;

 }
 }

 beforeVal = row.phone;


 if (err)
 return nextItemCallback(err);
 nextItemCallback(null);

 });

 if (err)
 return nextItemCallback(err);
 nextItemCallback(null);
 });

 delFunc(delBucket, insBucket, updateFunc);
 });
 }

 function deleteFriends(delBucket, insBucket, updateFunc) {


 async.eachSeries(delBucket, function (del, nextItemCallback) {
 if(err)
 nextItemCallback(err);
 nextItemCallback(null);

 conn.query(sql_delete_friends, [del], function (err, result) {

 });
 });

 updateFunc(insBucket, delBucket);

 }

 function updateFriends(insBucket, delBucket) {

 async.eachSeries(insBucket, function (ins, nextItemCallback) {
 if (err)
 return nextItemCallback(err);
 nextItemCallback(null);

 conn.query(sql_update_friends, [ins], function (err, result) {


 });
 });

 callback(null, insBucket, delBucket);

 }

 selectUsers(phoneBucket2, selectFriendsForUpdate, deleteFriends, updateFriends);
 });


 }

 */ //지우지마 알고리즘임
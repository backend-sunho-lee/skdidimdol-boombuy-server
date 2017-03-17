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


function create(user, callback) {
    var sql_insert_user = 'insert into users(phone, name, password, token) ' +
        'values(?, aes_encrypt(?, unhex(sha2(?, 512))), sha2(?, 512), ?)';
    var sql_insert_photo = 'insert into users_photos(uid) values (?)';

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        if (!user.name || !user.password || !user.phone) {
            err = new Error('회원가입 실패');
            return callback(err);
        }

        conn.query(sql_insert_user, [user.phone, user.name, aes_key, user.password, user.token], function (err, result) {
            logSql(this);
            if (err)
                return callback(err);

            var uid = result.insertId;
            conn.query(sql_insert_photo, [uid], function (err, result) {
                conn.release();
                if (err)
                    return callback(err);

                callback(null, user);
            });
        });
    });
}

function quit(phone, callback) {
    var sql_check_orders = 'select id, state from orders ' +
        'where receiver = ? and state = 1 ' +
        'union all ' +
        'select id, o.state ' +
        'from orders o join settlements s on (o.id = s.oid) ' +
        'where sender = ? and o.state = 1';
    var sql_delete_user = 'delete from users ' +
        'where phone = ?';
    var sql_select_photo = 'select id, bucket, s3key ' +
        'from users u join users_photos up on (u.id = up.uid) ' +
        'where phone = ?';
    var sql_delete_photo = 'delete from users_photos ' +
        'where uid = ?';
    var sql_delete_friendsUid = 'delete from friends where uid = ?';
    var sql_delete_friendsFuid = 'delete from friends where fuid = ?';
    var sql_delete_orders = 'delete from orders where receiver = ?';
    var sql_delete_settlements = 'delete from settlements where sender = ?';
    var sql_delete_carts = 'delete from carts ' +
        'where oid in (select id from orders where receiver = ? ) ';

    var deletePhoto = {};

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        function selectPhoto(nextCallback) {
            conn.query(sql_check_orders, [phone, phone], function (err, rows, fields) {
                logSql(this);
                if (err)
                    return nextCallback(err);

                if (rows.length !== 0) {
                    err = new Error('진행중인 주문이 있습니다.');
                    return nextCallback(err);
                }

                conn.query(sql_select_photo, [phone], function (err, rows, fields) {
                    logSql(this);
                    if (err)
                        return nextCallback(err);

                    if (rows.length) {
                        var uid = rows[0].id;
                        deletePhoto.bucket = rows[0].bucket;
                        deletePhoto.key = rows[0].s3key;

                        nextCallback(null, uid, deletePhoto);
                    } else {
                        nextCallback(null, null, null);
                    }
                });
            });
        }

        function removePhoto(uid, deletePhoto, nextCallback) {
            if (uid) {
                conn.query(sql_delete_photo, [uid], function (err, result) {
                    logSql(this);
                    if (err)
                        return nextCallback(err);

                    nextCallback(null, uid, deletePhoto);
                })
            } else {
                nextCallback(null, uid, null);
            }
        }

        function removeOrders(uid, deletePhoto, nextCallback) {
            if (uid) {
                conn.query(sql_delete_carts, [phone], function (err, result) {
                    logSql(this);
                    if (err)
                        return nextCallback(err);

                    conn.query(sql_delete_orders, [phone], function (err, result) {
                        logSql(this);
                        if (err)
                            return nextCallback(err);

                        conn.query(sql_delete_settlements, [phone], function (err, result) {
                            logSql(this);
                            if (err)
                                return nextCallback(err);

                            nextCallback(null, uid, deletePhoto);
                        });
                    });
                });
            } else {
                nextCallback(null, uid, null);
            }
        }

        function removeFriends(uid, deletePhoto, nextCallback) {
            if (uid) {
                conn.query(sql_delete_friendsFuid, [uid], function (err, result) {
                    logSql(this);
                    if (err)
                        return nextCallback(err);

                    conn.query(sql_delete_friendsUid, [uid], function (err, result) {
                        logSql(this);
                        if (err)
                            return nextCallback(err);

                        nextCallback(null, deletePhoto);
                    });
                })
            } else {
                nextCallback(null, null);
            }
        }

        function removeUser(deletePhoto, nextCallback) {
            conn.query(sql_delete_user, [phone], function (err, result) {
                logSql(this);
                if (err)
                    return nextCallback(err);

                nextCallback(null, deletePhoto);
            })
        }

        conn.beginTransaction(function (err) {
            if (err) {
                conn.release();
                return callback(err);
            }

            async.waterfall([selectPhoto, removePhoto, removeOrders, removeFriends, removeUser], function (err, deletePhoto) {
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
                        } else {
                            conn.release();

                            if (deletePhoto) {
                                S3.deleteObject({
                                    Bucket: deletePhoto.bucket,
                                    Key: deletePhoto.key
                                }, function (err, data) {
                                    if (err)
                                        return callback(err);
                                });
                            }
                            callback(null);
                        }
                    });
                }
            });
        });
    });
}


function findByPhone(phone, token2, callback) {
    var sql = 'select id, phone, token, ' +
        'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name ' +
        'from users ' +
        'where phone = ?';

    var sql_update_token = 'update users set token = ? where id = ?';

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err); //다음 라인으로 넘어가지 말라고 return코드를 심어줌 dbPool을 못 얻어올 수 도 있으니

        conn.query(sql, [aes_key, phone], function (err, rows, fields) {
            logSql(this);
            if (err)
                return callback(err);

            if (rows.length === 1) {  // phone : unique column
                var user = {};
                user.id = rows[0].id;
                user.phone = rows[0].phone;
                user.name = rows[0].name;
                user.password = rows[0].password;
                user.token = rows[0].token;

                if(rows[0].token !== token2) {
                    conn.query(sql_update_token, [token2, user.id], function (err, result) {
                        logSql(this);
                        if (err)
                            return callback(err);

                        callback(null, user);
                    });
                }

                conn.release();
                callback(null, user);
            } else {
                callback(null, null);
            }
        });
    });
}

function verifyPassword(password, user, callback) { // user 객체를 통해 user 정보를 가져옴
    var sql = 'select password = sha2(?, 512) as col ' +
        'from users ' +
        'where phone = ?';

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        conn.query(sql, [password, user.phone], function (err, rows, fields) {
            conn.release();
            logSql(this);
            if (err)
                return callback(err);


            if (rows[0].col === 1)
                callback(null, true);
            else
                callback(null, false);
        });
    });
}

function findUser(userId, callback) {
    var sql = 'select id, phone, token, ' +
        'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name, ' +
        'location ' +
        'from users u join users_photos up on (u.id = up.uid) ' +
        'where phone = ?';

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        conn.query(sql, [aes_key, userId], function (err, rows, fields) {
            conn.release();
            logSql(this);
            if (err)
                return callback(err);

            if (rows.length === 1) {  // phone : unique column
                var user = {};
                user.id = rows[0].id;
                user.phone = rows[0].phone;
                user.name = rows[0].name;
                user.token = rows[0].token;
                user.location = rows[0].location;

                callback(null, user);
            } else {
                callback(null, null);
            }
        });
    });
}


function updatePhoto(photos, uid, callback) {
    var sql_select_photos = 'select uid, location, bucket, s3key ' +
        ' from users_photos where uid = ?'; //필요한지 아직 모르겠어
    var sql_insert_photos = 'insert into users_photos (uid, location, bucket, s3key) ' +
        'values (?, ?, ?, ?)';
    var sql_update_photos = 'update users_photos set location = ?, bucket = ?, s3key = ? ' +
        'where uid = ?';
    // var sql_delete_photos = 'delete from user_photos where s3key = ? ';

    //TODO select_photos 해서 값이 아무것도 없으면 insert 해주자 값이 있으면 update로 넘어간다
    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        function selectPhotosForUpdate(nextCallback) {
            var beforePaths = ''; // 변경 전의 사진정보를 임시 저장
            var photoId = uid;
            var distinFlg;

            conn.query(sql_select_photos, [photoId], function (err, rows, fiedls) {
                logSql(this);
                if (err)
                    return nextCallback(err);
                var distinFlg = 0;

                if (!rows)
                    distinFlg = 1;
                else {
                    var beforePaths = rows[0].s3key;
                }

                photos[0].beforePaths = beforePaths;
                nextCallback(null, photoId, distinFlg);
            });
        }

        function doPhotosForUpdate(id, flg, nextCallback) {
            if (flg === 1) {
                conn.query(sql_insert_photos, [id, photos[0].location, photos[0].bucket, photos[0].key], function (err, result) {
                    logSql(this);
                    if (err)
                        return nextCallback(err);

                    nextCallback(null, photos);
                });
            } else if (flg === 0) {
                conn.query(sql_update_photos, [photos[0].location, photos[0].bucket, photos[0].key, id], function (err, result) {
                    logSql(this);
                    if (err)
                        return nextCallback(err);

                    nextCallback(null, photos);
                });
            }
        }

        conn.beginTransaction(function (err) {
            if (err) {
                conn.release();
                return callback(err);
            }

            async.waterfall([selectPhotosForUpdate, doPhotosForUpdate], function (err, photos) {
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
                        } else {
                            var params = {
                                Bucket: 'boombuy', /* required */
                                Delete: {
                                  /* required */
                                    Objects: [{Key: photos[0].beforePaths}],
                                    Quiet: true || false
                                }
                            };

                            S3.deleteObjects(params, function (err, data) {
                                if (err) {
                                    err = new Error('사진 변경 실패2');
                                    return callback(err);
                                }
                            }, function (err, data) {
                                if (err)
                                    return callback(err);
                            });

                            conn.release();
                            callback(null);
                        }
                    })
                }
            })
        })
    });
}


function alaramForToken(phoneLists, callback) {
    var sql_select_users = 'select token from users where phone = ?';
    var tokenbuckets = [];
    var cnt = 0;
    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        async.each(phoneLists, function (phone, nextItemCallback) {
            conn.query(sql_select_users, [phone], function (err, rows, fiedls) {

                logSql(this);
                if (err)
                    return nextItemCallback(err);

                cnt++;
                tokenbuckets.push(rows[0].token);

                nextItemCallback(null);
            });
        }, function (err) {
            if (err)
                return callback(err);
            conn.release();
            callback(null, tokenbuckets);
        });
    });
}


function alaramForToken2(phone, callback) {
    var sql_select_users = 'select token from users where phone = ?';
    var tokenbuckets = [];

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        conn.query(sql_select_users, [phone], function (err, rows, fiedls) {
            conn.release();
            logSql(this);

            if (err)
                callback(err);

            tokenbuckets = rows[0].token;

            callback(null, tokenbuckets);

        });



    });
}

function checkToken(token, user, callback) {
    var sql_update_token = 'update users ' +
        'set token = ? ' +
        'where id = ?';

    dbPool.getConnection(function (err, conn) {
        if (err)
            return callback(err);

        conn.query(sql_update_token, [token, user.id], function (err, user) {
            conn.release();
            logSql(this);
            if (err)
                return callback(err);

            user.token = token;
            callback(null, user);
        });
    });
}


module.exports.findByPhone = findByPhone;
module.exports.verifyPassword = verifyPassword;
module.exports.findUser = findUser;
module.exports.create = create;
module.exports.quit = quit;
module.exports.updatePhoto = updatePhoto;
module.exports.alaramForToken = alaramForToken;
module.exports.checkToken = checkToken;
module.exports.alaramForToken2 = alaramForToken2;

/*
 function findByPhone(phone, callback) {
 var sql = 'select id, phone, token, ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name ' +
 'from users ' +
 'where phone = ?';

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err); //다음 라인으로 넘어가지 말라고 return코드를 심어줌 dbPool을 못 얻어올 수 도 있으니

 conn.query(sql, [aes_key, phone], function (err, rows, fields) {
 conn.release();
 if (err)
 return callback(err);

 if (rows.length === 1) {  // phone : unique column
 var user = {};
 user.id = rows[0].id;
 user.phone = rows[0].phone;
 user.name = rows[0].name;
 user.password = rows[0].password;
 user.token = rows[0].token;

 console.log('11111111111' + user.token);
 callback(null, user);
 } else {
 callback(null, null);
 }
 });
 });
 }

 function verifyPassword(password, user, callback) { // user 객체를 통해 user 정보를 가져옴
 var sql = 'select password = sha2(?, 512) as col ' +
 'from users ' +
 'where phone = ?';

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 conn.query(sql, [password, user.phone], function (err, rows, fields) {
 conn.release();
 if (err)
 return callback(err);


 if (rows[0].col === 1)
 callback(null, true);
 else
 callback(null, false);
 });
 });
 }

 function findUser(userId, callback) {
 var sql = 'select id, phone, token,  ' +
 'cast(aes_decrypt(name, unhex(sha2(?, 512))) as char(40)) as name, ' +
 'location ' +
 'from users u join users_photos up on (u.id = up.uid) ' +
 'where phone = ?';

 dbPool.getConnection(function (err, conn) {
 if (err)
 return callback(err);

 conn.query(sql, [aes_key, userId], function (err, rows, fields) {
 conn.release();
 if (err)
 return callback(err);

 if (rows.length === 1) {  // phone : unique column
 var user = {};
 user.id = rows[0].id;
 user.phone = rows[0].phone;
 user.name = rows[0].name;
 user.location = rows[0].location;
 user.token = rows[0].token;

 callback(null, user);
 } else {
 callback(null, null);
 }
 });
 });
 }
 */
/*//TODO 20 번
 function checkToken(token, user, callback) {
 var sql_update_token = 'update users ' +
 'set token = ? ' +
 'where id = ?';

 dbPool.getConnection(function (err, conn) {


 conn.query(sql_update_token, [token, user.id], function (err,  user) {
 conn.release();

 user.token = token;
 callback(null, user);
 });

 });
 }*/
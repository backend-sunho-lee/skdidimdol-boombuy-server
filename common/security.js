function isSecure(req, res, next) {
  if (req.secure)
    return next();

  var err = new Error('Protocol Upgrade Required!!!!!');
  err.statusCode = 426;     // 400, 500으로 퉁 쳐도 된다
  next(err);
}

function isLoggedIn(req, res, next) {
  if (!req.user) {
    return res.status(401).send({
      message: 'login required'
    });
  }
  next();
}

module.exports.isSecure = isSecure;
module.exports.isLoggedIn = isLoggedIn;
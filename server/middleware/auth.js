const models = require('../models');
const Promise = require('bluebird');

var assignSession = (req, res, next) => {
  models.Sessions.create()
  .then((results) => {
    // get the hash
    return models.Sessions.get({id: results.insertId});
  })
  .catch((err) => {
    if (err) { throw err; }
  })
  .then((session) => {
    req.session.hash = session.hash;
    // res.cookies.shortlyid = {};
    res.cookie('shortlyid', req.session.hash, {httpOnly: false});
    next();
  });
};

module.exports.createSession = (req, res, next) => {
  
  req.session = {};
  // Check if req cookies has a shortlyid
  if (req.cookies.shortlyid) {
    req.session = {hash: req.cookies.shortlyid};
    
    models.Sessions.get({hash: req.cookies.shortlyid})
    .then((session) =>{
      if (session === undefined) {
        assignSession(req, res, next);
      } else if (session.userId !== null) {
        req.session.userId = session.userId;  
        return models.Users.get({id: session.userId});
      } else {
        next();
      }
    })
    .then((user) => {
      if (user === undefined) {
        console.log('user undefined');
      } else {
        req.session.user = {username: user.username};  
        next(); 
      }
    })
    .catch((err) => {
      if (err) { throw err; }
    });
    
  } else {
    // If no session id in the cookies
    // create a new session
    assignSession(req, res, next);
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/









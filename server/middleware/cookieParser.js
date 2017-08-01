const parseCookies = (req, res, next) => {
  
  //'shortlyid=18ea4fb6ab3178092ce936c591ddbb90c99c9f66; otherCookie=2a990382005bcc8b968f2b18f8f7ea490e990e78; anotherCookie=8a864482005bcc8b968f2b18f8f7ea490e577b20'

  var cookies = req.headers.cookie;
  req.cookies = {};

  if (cookies) {

    var arrCookies = cookies.split('; ');
    arrCookies.forEach(function(cookie) {
      var keyVal = cookie.split('=');
      req.cookies[keyVal[0]] = keyVal[1];
    });
  } 
  next();
};

module.exports = parseCookies;
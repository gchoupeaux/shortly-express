const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const cookieParser = require('./middleware/cookieParser');
const auth = require('./middleware/auth');
const models = require('./models');
const db = require('./db/index');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser);
app.use(auth.createSession);

app.get('/', 
(req, res) => {
  if (req.session.userId) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/create', 
(req, res) => {
  if (req.session.userId) {
    res.render('index');
  } else {
    res.redirect('/login');
  }
});

app.get('/links', 
(req, res, next) => {
  if (req.session.userId) {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  } else {
    res.redirect('/login');
  }
});

app.post('/links', 
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/signup', 
(req, res, next) => {
  
  models.Users.create({username: req.body.username, password: req.body.password})
  .then ((results) => {
    results.insertId;
    models.Sessions.update({hash: req.session.hash}, {userId: results.insertId});
  })
  .then(() => {
    res.redirect('/');
  })
  .catch((err) => {
    if (err.code === 'ER_DUP_ENTRY') {
      res.redirect('/signup');
    } else {
      throw err;
    }
  });  
});

app.get('/signup', (req, res, next) => {
  res.render('signup');
});

app.post('/login', 
(req, res, next) => {
  var attemptedUsername = req.body.username;
  var attemptedPassword = req.body.password;
  // get the login username
  models.Users.get({username: attemptedUsername})
  .then((user) => {
    // check if attempted password matches existing pw and salt
    if (models.Users.compare(attemptedPassword, user.password, user.salt)) {
      // If true, redirect to '/'
      res.redirect('/');
    } else {
      // else redirect to '/login'
      res.redirect('/login');
    }
  })
  .catch((err) => {
    // if no results
    if (err) {
      // then redirect to '/login'
      res.redirect('/login');
    }
  });
});

app.get('/login', (req, res, next) => {
  res.render('login');
});

app.get('/logout', 
auth.destroySession, 
(req, res, next) => res.redirect('/login'));
/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;

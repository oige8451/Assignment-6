/********************************************************************************
 *  WEB322 – Assignment 06
 *
 *  I declare that this assignment is my own work in accordance with Seneca's
 *  Academic Integrity Policy:
 *
 *  https://www.senecacollege.ca/about/policies/academic-integrity-policy.html
 *
 *  Name: _______Tomi ige_______________ Student ID: ____169604220 __________ Date: _______12/8/24_______
 *
 *  Published URL: _______________________________________________________
 *
 ********************************************************************************/

const express = require("express");
const clientSessions = require("client-sessions");
const legoSets = require("./modules/legoSets");
const authData = require('./modules/auth-service');
const HTTP_PORT = process.env.PORT || 8080;
const app = express();

// Set the view engine to EJS
app.set("view engine", "ejs");
//mark the "public" folder as "static"
app.use(express.static("public"));
// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

app.use(clientSessions({
  cookieName: "session",
  secret: "o6LjQ5EVNC28ZgK64hDELM18ScpFQr",
  duration: 2 * 60 * 1000, // 2 minutes
  activeDuration: 1000 * 60  * 10, // 1 minute
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

// Initialize the sets data and start the server only after successful initialization
legoSets
  .initialize()
  .then(authData.initialize)
  .then(function () {
    app.listen(HTTP_PORT, function () {
      console.log(`app listening on: ${HTTP_PORT}`);
    });
  })
  .catch(function (err) {
    console.log(`unable to start server: ${err}`);
  });


// Define the routes
app.get("/", (req, res)  => {
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/lego/sets", (req, res) => {
  const theme = req.query.theme; 
  if (theme) {
    legoSets.getSetsByTheme(theme)
      .then((sets) => {
        if (sets.length === 0) {
          return res.status(404).render("404", {message: "No sets found for the selected theme."});
        } else {
          res.render("sets", { sets });
        }
      })
      .catch((error) =>
        res.status(404).render("404", {message: `Error retrieving sets by theme: ${error.message}`}));
  } else {
    legoSets.getAllSets()
      .then((sets) => {
        if (sets.length === 0) {
          return res.status(404).render("404", { message: "No sets found." });
        } else {
          res.render("sets", { sets });
        }
      })
      .catch((error) =>
        res.status(404).render("404", {message: `Error retrieving all Lego sets: ${error.message}`}));
  }
});

app.get("/lego/sets/:set_num", (req, res) => {
  const setNum = req.params.set_num; // Get set_num from route parameters
  legoSets.getSetByNum(setNum)
    .then((set) => {
      if (set) {
        res.render("set", { set: set });
      } else {
        res.status(404).render("404", {message: `Lego set with set_num ${setNum} not found.` });
      }
    })
    .catch((error) =>
      res.status(404).render("404", {message: `Error retrieving set by set_num: ${error.message}` }));
});

app.get("/lego/addSet", ensureLogin, (req, res) => {
  legoSets.getAllThemes()
  .then((themes) => res.render("addSet", { themes }))
  .catch((error) => res.status(500).render("500", { message: `Error loading themes: ${error.message}` }));
});


app.post("/lego/addSet", ensureLogin, (req, res) => {
  const { set_num, name, year, num_parts, img_url, theme_id } = req.body;
  legoSets.addSet({ set_num, name, year, num_parts, img_url, theme_id })
    .then(() => {res.redirect("/lego/sets");
    })
    .catch((error) => {
      res.status(500).render("500", { message: `Error adding set: ${error.message}` });
    });
});

// GET /lego/editSet/:num
app.get("/lego/editSet/:num", ensureLogin, (req, res) => {
  const setNum = req.params.num;
  Promise.all([
    legoSets.getSetByNum(setNum),
    legoSets.getAllThemes()
  ])
  .then(([set, themes]) => {
    res.render('editSet', { themes, set });
  })
  .catch(error => {
    res.status(404).render("404", { message: `Error retrieving set or themes: ${error.message}` });
  });
});

// POST /lego/editSet
app.post("/lego/editSet", ensureLogin, (req, res) => {
  const { set_num, name, year, num_parts, img_url, theme_id } = req.body;
  legoSets.editSet(set_num, { name, year, num_parts, img_url, theme_id })
    .then(() => {res.redirect("/lego/sets");
    })
    .catch((error) => {
      res
        .status(500)
        .render("500", {
          message: `I'm sorry, but we have encountered the following error: ${error.message}`,
        });
    });
});

app.get("/lego/deleteSet/:num", ensureLogin,(req, res) => {
  const setNum = req.params.num;

  legoSets
    .deleteSet(setNum)
    .then(() => {
      res.redirect("/lego/sets");
    })
    .catch((err) => {
      res.render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
      });
    });
});

app.get('/login', (req, res) => {
  res.render('login', {
      userName: req.query.userName || '',  // Pass userName from query parameters or default to empty string
      errorMessage: ''                     // Initialize errorMessage to an empty string
  });
});

app.get("/register", (req, res) => {
  res.render("register", {
    successMessage: '',  // Ensure this is initialized
    errorMessage: '',    // Ensure this is initialized
    userName: '',        // Ensure this is initialized
    email: ''            // Ensure this is initialized
  });
});
app.post('/login', (req, res) => {
  const userData = req.body;
  userData.userAgent = req.get('User-Agent');
  authData.checkUser(userData)
      .then(user => {
          req.session.user = {
              userName: user.userName,
              email: user.email,
              loginHistory: user.loginHistory
          };
          res.redirect('/lego/sets');
      })
      .catch(err => {
          res.render('login', {
              errorMessage: err.message,
              userName: userData.userName
          });
      });
});

app.post('/register', (req, res) => {
  const userData = req.body;
  authData.registerUser(userData)
      .then(() => {
          res.render('register', {
              successMessage: "User created"
          });
      })
      .catch(err => {
          res.render('register', {
              errorMessage: err,
              userName: userData.userName
          });
      });
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory', {
      loginHistory: req.session.user.loginHistory
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).render("404", { message: "Page not found." });
});

// Handle 500 errors
app.use((err, req, res, next) => {
  console.error(`500 Error: ${err.message}`);
  res.status(500).render("500", { message: `Internal Server Error: ${err.message}` });
});
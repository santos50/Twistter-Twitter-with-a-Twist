const http = require('http');
const path = require("path");
const express = require("express");
const app = express();
const port = process.env.PORT || "5000";
var router = express.Router();
var cookieParser = require('cookie-parser');
var session = require('express-session');
const util = require('util');
var ejs = require('ejs');
var bodyParser = require('body-parser');


//app.use(express.static(__dirname + "/views"));
//app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));

var AES = require("crypto-js/aes");
var SHA256 = require("crypto-js/sha256");
var CryptoJS = require("crypto-js");
console.log(CryptoJS.HmacSHA1("Message", "Key"));

var nodemailer = require('nodemailer');
var fs = require('fs') // notice this
const { promisify } = require('util');
const readFile = promisify(fs.readFile);


app.use(cookieParser());
app.use(session({ secret: 'Does this work?' }));
app.use(bodyParser.urlencoded({ extended: false }));



app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', function (req, res, html) {
  res.sendFile(path.join(__dirname + '/signup.html'));
});

app.get('/login', function (req, res, html) {
  res.sendFile(path.join(__dirname + '/login.html'));
});

app.get('/discover', function (req, res) {
  if (Object.keys(req.query).length == 0) {
    user.find(function (err, users) {
      //render all users
      res.render('discovery_page', { users: users });
    });
  } else {
    //render only users matching what user typed in
    user.find({ username: { $regex: "^" + req.query.search + ".*", $options: 'i' } }, function (err, users) {
      if (err) {
        console.log(err);
      } else {
        res.render('discovery_page', { users: users });
      }
    });
  }
});



app.get('/posted', function (req, res) {
  post.find(function (err, posts) {
    if (err) {
      console.log(err);
    } else {
      res.render('display-posts', { posts: posts });
      // console.log('posts are ', posts);
    }
  });
});


app.get('/id', function (req, res) {
  var user_clicked_id = ""
  var userTopics = ""
  var followedTopics = "";
  var user_clicked = user.findOne({ username: req.query.username }, function (err, document) {
    // user_clicked_id = document._id;
    user_clicked_id = document.username;
    app.locals.userlineID = user_clicked_id;
    console.log('user_clicked_id is', app.locals.userlineID);
   
    // //will find current user's topic list for the selected user (req.qeury.username)
    // user.findOne({ username: req.session.username }, 'following', (err, document) => {
    //     var followIndex = "";

    //     if (document.following == null) {
    //       followedTopics = ""
    //     } else {
    //     for (var m = 0; m < document.following.length; m++) {
    //       console.log(document.following[m].username);
    //       console.log(req.query.username);
    //       if (document.following[m].username == req.query.username) {
    //         followIndex = m;
    //         break;
    //       }
    //     }
    //     if (document.following[m].topics == null) {
    //       followedTopics = "";
    //     } else {
    //     followedTopics = document.following[m].topics;
    //     }
    // }
    //   app.locals.currUserTopicFollows = followedTopics;
    // }); //end of finding topic list

    post.find(function (err, posts) {
      if (err) {
        console.log(err);
      } else {
        //get the user topics
        if (document.topics === null) {
          userTopics = "";
        } else {
          userTopics = document.topics;
          app.locals.userTopics = userTopics;
        }
        

        //pass in the user's posts and topics
        res.render('display-others-posts', { posts: posts });
      }
    });
  });
});

app.get('/user-followed', function (req, res) {
  // console.log('req is', req);
  // console.log('req topics are ', req.query.topics);
  // console.log('req username is ', req.query.user_followed);
  user.findOne({ username: req.session.username }, 'following', (err, userData) => {

    var userExists = false;
    //check if person is already following user
    userData.following.forEach(function (following_person) {
        if(following_person.username == req.query.user_followed){
          userExists = true;
          console.log("person already follows user");

            //clears whole user-topic list for specified user and updates with new followed topics
            var j, k, l;
            //loop for finding user in user-topic
            for (j = 0; j < userData.following.length; j++) {
              //once user is found, delete all topics from list
              if (userData.following[j].username == req.query.user_followed) {

                if (req.query.topics == null) {
                  if (j > -1) {
                    userData.following.splice(j, 1);
                    console.log('SPLICING');
                  }
                } else {
                    console.log(userData.following[j].username + '=' + req.query.user_followed);
                    console.log(j);
                    var topicSize = userData.following[j].topics.length
                    for (k = 0 ; k < topicSize; k++) {
                    userData.following[j].topics.pop();
                 }
                 break;
                }//end else
              }
            }
               /* req.query.topics is a String if only one topic is selected
                  for following. Else, it is of type Array */
              if (req.query.topics != null) {
              if (Object.getPrototypeOf(req.query.topics) === String.prototype) {
                  userData.following[j].topics.push(req.query.topics);
              } else {
                for (l = 0; l < req.query.topics.length; l++) {
                  userData.following[j].topics.push(req.query.topics[l]);
                }
              }
             // console.log(userData.following[j].topics);
            }
              userData.save();
        }
    });

    //if person is not following user, add them
    if(!userExists){
      var newFollowing = {
        username: req.query.user_followed,
        topics: req.query.topics,
      };
      userData.following.push(newFollowing);
      userData.save();
      console.log("user added successfully");
    } 

    res.redirect(req.get('referer'));

  });



});

app.get('/display_personal', function (req, res) {
  app.locals.userIDejs = req.session.username;
  //THERE IS SOMETIMES AN ISSUE HERE WHERE THE DOCUMENT IS NULL
  //IF IT IS NULL, THEN WE CAN RENDER A PAGE WHERE WE PROMPT THE USER TO LOGIN
  //THIS HAPPENS WHEN I REFRESH THE PAGE
  console.log("THE USER IS", app.locals.userIDejs);
  var userTopics = ""
  user.findOne({ username: req.session.username }, 'username topics', (err, document) => {
console.log()
    if (document.topics == null) {
      console.log("THIS IS NULL");
      userTopics = ""
    } else {
      console.log("NOT NULL");
      userTopics = document.topics;
    }
    app.locals.finalUserTopics = userTopics;
  });

  post.find(function (err, posts) {
    if (err) {
      console.log(err);
    } else {
      res.render('display-personal-posts', { posts: posts, email: req.session.email, username: req.session.username });
      // console.log(posts);
    }
  });
});

var mongoose = require("mongoose");
var passport = require("passport");
var bodyParser = require("body-parser");
var user = require("./models/user"); //reference to user schema
var post = require("./models/post"); //reference to post schema
//var Posts = mongoose.model('Posts', postSchema);

//Connection start
mongoose.Promise = global.Promise;
mongoose.connect('mongodb+srv://Twistter:CS30700!@twistter-dcrea.mongodb.net/Twistter307?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true }, function (error) {
  if (error) {
    console.log("Couldn't connect to database");
  } else {
    console.log("Connected To Database");
  }
});


//Login, Logout, Signup
app.use(express.urlencoded())
app.post("/signup", (req, res) => {
  //receiving form information from signup.html
  const e = req.body.email;
  const u = req.body.username;
  const p = req.body.password;

  //Sending email to new user
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'twistter307@gmail.com',
      pass: 'CS30700!'
    }
  });

  var mailOptions = {
    from: 'twistter307@gmail.com',
    to: e,
    subject: 'Thank you for signing up with Twistter',
    text: 'Hello, Hope you enjoy the application :)'
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  //using CryptoJS to encrypt password
  encrypttedP = CryptoJS.SHA1(p);
  encrypttedP = encrypttedP.toString(CryptoJS.enc.Base64);
  //res.status(204).send();
  //res.end();

  //formatting the email and password info into the user schema
  var newUser = new user({
    email: e,
    username: u,
    password: encrypttedP,
    topics: []
  });
  //saving the new user to the database

  newUser.save(function (err, e) {

    console.log(err);
    var alert = "alert('Yikes! There's been an error. Please try again at a different time.')";

    if (err) {
      if (err.name == 'ValidationError') {
        if (err.message.includes('username')) {
          alert = "alert('Username already exists. Please try a different one.')";
        } else if (err.message.includes('email')) {
          alert = "alert('Email already registered with account. Please try a different email.')"
        }
      }
      fs.readFile('./signup.html', 'utf8', function (err, data) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        var result = data.replace(/\<\/script>/g, alert + '</script>');
        res.write(result);
        res.end();
        return;
      });
    } else {
      res.sendFile(path.join(__dirname + '/login.html'));
      console.log("new user successfully saved");
    }
  })
});


//Login
app.post("/login", (req, res) => {
  //receiving form information from signup.html
  const e = req.body.email;
  const p = req.body.password;
  encrypttedP = CryptoJS.SHA1(p);
  encrypttedP = encrypttedP.toString(CryptoJS.enc.Base64);

  //looks for a user in the database with the same email

  user.findOne({ email: e }, 'email username password', (err, userData) => {
    //console.log(userData);
    if (userData == null) {
      res.sendFile(path.join(__dirname + '/login.html'))
      //res.status(200).send("UserData is null")
    } else if (encrypttedP === userData.password) {
      //Redirect here!
      //Redirect to main posts page
      console.log("Login Successful")
      req.session.email = req.body.email;
      req.session.userID = userData._id;
      req.session.username = userData.username;
      req.session.posts = userData.posts;
      //console.log(userData.username);
      //console.log(req.session.userID);
      res.redirect('/posted');
    } else {
      //res.status(200).send("Failed Login");
      //res.send('Your username/password is incorrect, try again')
      res.sendFile(path.join(__dirname + '/login.html'), 'Error your username/password is incorrect, try again')
    }
  });
})

app.post("/posted", (req, res) => {
  // console.log("POSTS");
  var currDate = new Date();
  var newPost = new post({
    title: req.body.title,
    description: req.body.description,
    topic: req.body.topic,
    date: currDate,
    user: req.session.username,
    likes: 0,
    dislikes: 0
  });

  user.findOne({ username: req.session.username }, 'username topics', (err, userData) => {
    if (!userData.topics.includes(req.body.topic)) {
      userData.topics.push(req.body.topic);
      userData.save();
    }
  });

  //console.log("newPost is", newPost);
  newPost.save(function (err, e) {
    if (err) return console.error(err);
    else return console.log('succesfully saved');
  })
  res.status(204).send();

});

app.post("/like", (req, res) => {
  user.findOne({ username: req.session.username }, 'interactions', (err, userData) => {
    var newInteraction = {
      postID: req.body.id.toString(),
      liked: true,
      disliked: false
    };
    //check to see if user has already liked this post
    var alreadyInteracted = false;
    var beenDisliked = false;
    userData.interactions.forEach(function (post) {
      if (post.postID === req.body.id.toString()) {
        if (!post.disliked) {
          //console.log("CANT LIKE-------------------------------------------------");
          //console.log(post);
          beenDisliked = post.disliked;
          alreadyInteracted = true;
        } else {
          //undo a dislike and like instead
          beenDisliked = post.disliked;
          alreadyInteracted = false;
          //console.log(post);
        }

      }
    })
    if (!alreadyInteracted) {
      //update user's liked posts
      userData.interactions.push(newInteraction);
      userData.save();
      //update the like count on the post
      post.findOne({ _id: req.body.id }, 'likes dislikes', (err, postData) => {
        postData.likes += 1;
        //if has been disliked, switch to a like
        if (beenDisliked) {
          postData.dislikes -= 1;
        }

        postData.save();
        //console.log("LIKED----------------------------------");
      });
    }
  });
});

app.post("/dislike", (req, res) => {
  user.findOne({ username: req.session.username }, 'interactions', (err, userData) => {
    var newInteraction = {
      postID: req.body.id.toString(),
      liked: false,
      disliked: true
    };
    //check to see if user has already liked this post
    var alreadyInteracted = false;
    var beenLiked = false;
    userData.interactions.forEach(function (post) {
      if (post.postID === req.body.id.toString()) {
        if (!post.liked) {
          //console.log("CANT DISLIKE-------------------------------------------------");
          //console.log("TEST@: " + post);
          alreadyInteracted = true;
        } else {
          //undo a dislike and like instead
          beenLiked = post.liked;
          alreadyInteracted = false;
          //console.log("TEST: " + post);
        }
      }
    })
    if (!alreadyInteracted) {
      //update user's liked posts
      userData.interactions.push(newInteraction);
      userData.save();

      //update the like count on the post
      post.findOne({ _id: req.body.id }, 'likes dislikes', (err, postData) => {
        postData.dislikes += 1;
        //if has been disliked, switch to a like
        if (beenLiked) {
          postData.likes -= 1;
        }

        postData.save();
        //console.log("DISLIKED---------------------------------");
      });
    }
  });
});

module.exports = router

app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});

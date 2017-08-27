var express = require("express");
var cors = require('cors');
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var auth = require('./middleware');
var jwt  = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var ObjectID = mongodb.ObjectID;
const uuidV4 = require('uuid/v4');

var USERS_COLLECTION = "users";

var app = express();
var corsOptions = {
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}
app.use(cors(corsOptions));
app.use(express.static(__dirname + '/views'));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI || "mongodb://lfx:98gaetano98@ds163711.mlab.com:63711/vrhouseplanner", function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});

// USERS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get('/',function(req,res){
  res.sendFile(__dirname+'/views/index.html');
});
app.post("/api/token", function(req, res) {
  console.log(req.body);
  db.collection(USERS_COLLECTION).findOne({name:req.body.name},function(err, user) {

    if (err) {
      res.json({ success: false, message: "Failed to get token."});
    } else if(!user){
      res.json({ success: false, message: "Authentication failed. User not found."});
    }else {
      bcrypt.compare(req.body.password, user.password, function (err, valid) {
         if (err || !valid) {
           res.json({ success: false, message: 'Authentication failed. Wrong password.' });
         }
          else
          {
           var token = jwt.sign({name: user.name, password: user.password, _id:user._id},'idc');
           res.json({success: true,message: 'Enjoy your token!',token: token});
         }
     });
    }
  });

});
app.post("/api/register", function(req, res) {

  bcrypt.hash(req.body.password, 10, function (err, hash) {

      var newUser = {name:req.body.name,password:hash,admin:req.body.admin,projects:req.body.projects};

      if (!req.body.name) {
          res.json({ success: false, message: "Invalid user input Must provide a name."});
      }
      else if (!req.body.password) {
          res.json({ success: false, message: "Invalid password Must provide a password."});
      }
      else{
        db.collection(USERS_COLLECTION).insertOne(newUser, function(err, doc) {
          if (err) {
              res.json({ success: false, message: "Failed to create new user."});
          } else {
            res.status(201).json(doc.ops[0]);
          }
        });
      }

   });
});

//apply the middleware function to the routes below
app.use(auth);

app.get('/api/:user/projects', function(req,res){
   var userID = req.params.user;
   console.log(req.body);
   db.collection(USERS_COLLECTION).find({"_id":ObjectID(userID)}).toArray(function(err,docs){
     if(err) res.json({'message':err}); else res.json(docs[0].projects);
   });
});
app.get('/api/:user/projects/:id',function(req,res){

    var userID = req.params.user;
    var projectID = req.params.id;

    db.collection(USERS_COLLECTION).findOne(
      {"_id":ObjectID(userID),"projects._id":projectID},
      {'projects.$':1}
    ,function(err,result){
      if(err) res.json({'message':err}); else res.json(result);
    });
});
app.put('/api/:user/projects', function(req,res){

    var userID = req.params.user;
    var project = req.body;
    project["_id"] = uuidV4();
    db.collection(USERS_COLLECTION).updateOne({"_id":ObjectID(userID)},{$push: {"projects":project}},function(err,result){
      if(err) {
        res.json({'message':err});
      }else{
        db.collection(USERS_COLLECTION).findOne({"_id":ObjectID(userID),"projects._id":project["_id"]},{'projects.$':1},function(err,result){
            res.json(result.projects[0]);
        });
      }
    });
});
app.put('/api/:user/update/projects/:id', function(req,res){
    var userID = req.params.user;
    var projectID =  req.params.id;
    var project = req.body;
    project["_id"] = projectID;
    db.collection(USERS_COLLECTION).updateOne({"_id":ObjectID(userID),"projects._id":projectID},{$set : { 'projects.$': project }},function(err,result){
      if(err) res.json({'message':err}); else {res.json(result)};
    });
});
app.put('/api/:user/remove/projects/:id', function(req,res){
    var userID = req.params.user;
    var projectID = req.params.id;
    db.collection(USERS_COLLECTION).updateOne(
      { "_id":ObjectID(userID)},{$pull: { 'projects': {'_id':projectID }  }
     },function(err,result){
      if(err) res.json({'message':err}); else res.json(result);
    });
});

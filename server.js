const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')


const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: {type: Date, default: Date.now}
  }]
})

const User = mongoose.model('User', userSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//start here
app.get("/test", (req, res) => {
  res.send("hello world");
})

// create new user
app.route("/api/exercise/new-user").get((req, res) => {
  const username = req.query.username;
  res.json({
    username
  })
}).post((req, res) => {
  console.log(process.env.TEST);
  const username = req.body.username;
  User.create({username}, (err, data) => {
  err ? console.log("error") : res.json({
    id: data.id,
    username: data.username
  });
 });
});


// add exercise with userId
app.route("/api/exercise/add").get((req, res) => {
  // pull user id from database and add exercise then update
  const userId = req.query.userId;
  const description = req.query.description;
  const duration = req.query.duration;
  const date = req.query.date;
  res.json({
    userId,
    log: [{
    description,
    duration,
    date
    }]
  })
}).post((req, res) => {
  const userId = req.body.userId;
  const description = req.body.description;
  const duration = req.body.duration;
  const date = req.body.date;

  User.findById(userId, (err, data) => {
    data.log.push({
      description,
      duration,
      date
    });
    console.log(data);
    data.markModified('log');
    data.save((err) => {
      if(err) return console.log(err);
    });
    res.json({data});
  });
});

// find user's exercise data
app.get('/api/exercise/log', (req, res) => {
  const limit = req.query.limit;
  const from = req.query.from;
  const to = req.query.to;
  User.findById(req.query.userId, (err, data) => {
    if(err) {
      console.log(err);
    }else if(from && to) {
      let range = data.log.filter(e => new Date(e.date) >= new Date(from) && new Date(e.date) <= new Date(to)).slice(0, limit);
      res.json({
        username: data.username,
        userId: data.id,
        log: range
      });
    }else if(from && !to) {
      range = data.log.filter(e => new Date(e.date) >= new Date(from)).slice(0, limit);
      res.json({
        username: data.username,
        userId: data.id,
        log: range
      });
    }else if(!from && to) {
      range = data.log.filter(e => new Date(e.date) <= new Date(to)).slice(0, limit);
      res.json({
        username: data.username,
        userId: data.id,
        log: range
      });
    }else {
      range = data.log.slice(0, limit);
      res.json({
        username: data.username,
        userId: data.id,
        log: range
      });
    }
  });
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

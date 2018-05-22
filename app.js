require('dotenv').config();

var express         = require("express"),
    app             = express(),
    bodyParser      = require("body-parser"),
    mongoose        = require("mongoose"),
    passport        = require("passport"),
    LocalStrategy   = require("passport-local"),
    Campground      = require("./models/campground"),
    seedDB          = require("./seeds"),
    User            = require("./models/user"),
    Comment         = require("./models/comment"),
    methodOverride  = require("method-override"),
    flash           = require("connect-flash");
 
// importing/requiring the router variable in all the three files   
var campgroundRoutes    = require("./routes/campgrounds"),
    commentRoutes       = require("./routes/comments"),
    indexRoutes          = require("./routes/index");


// mongoose.connect("mongodb://localhost/yelp_camp");
mongoose.connect("mongodb://vio:pudding@ds135552.mlab.com:35552/cadyelpcamp");

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
// __dirname: current directory file path => more secure
app.use(methodOverride("_method"));
app.use(flash()); // this line must come before passport configuration

// seeding the database (remove all data and create them again)
// seedDB();

app.locals.moment = require("moment");

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Pudding is the cutest!",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// the last 3 lines come with passport-local-mongoose package

// creating a middleware using app.use and this will pass the function to all the routes
// here the middleware function is telling the route to pass req.user as currentUser to the ejs template
app.use(function(req, res, next){
   res.locals.currentUser = req.user; // passport will pass in current username and id# from req.user to ejs file if someone has logged in
   res.locals.error = req.flash("error");
   // here we only need to pass in req.flash("error") as the message, doesn't need the value
    // see the middleware file index.js for the real req.flash() message
    // next step: go to header.ejs and add the line for the message to appear.
    res.locals.success = req.flash("success");
   next(); // next() is important for middleware no matter what the function does, we have to put in next() to tell it to move on
});

// tell app.js to use the router from the routes files
app.use(indexRoutes);
app.use("/campgrounds", campgroundRoutes); // adding "/campgrounds" in front is to append that to all the routes in campgroundRoutes so that we can simplify our routes in camgroundRoutes
app.use("/campgrounds/:id/comments", commentRoutes);


app.listen(process.env.PORT, process.env.IP, function(){
    console.log("The YelpCamp Server Has Started!!");
});
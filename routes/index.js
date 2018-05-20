var express         = require("express"),
    router          = express.Router(),
    User            = require("../models/user"),
    passport        = require("passport");

// ROOT ROUTE
router.get("/", function(req, res){
   res.render("landing");
});

// show register form
router.get("/register", function(req, res){
    res.render("register", {page: "register"});
});

// handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message + ".");
            return res.redirect("/register"); 
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Welcome to YelpCamp, " + user.username + "!");
            res.redirect("/campgrounds");
        });
    });
});

// show login form
router.get("/login", function(req, res){
    res.render("login", {page: "login"}); 
});

// handle login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failedRedirect:"/login"
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged you out!"); // as we add res.locals.message = req.flash("error"); in app.js already, we can just add this line here to make the flash message show up
    res.redirect("/campgrounds");
});

module.exports = router;
var express         = require("express"),
    router          = express.Router(),
    User            = require("../models/user"),
    Campground      = require("../models/campground"),
    middleware      = require("../middleware"),
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
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        avatar: req.body.avatar,
        email: req.body.email
    });
    
    if(req.body.adminCode === "123456"){
        newUser.isAdmin = true;
    }
    
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

// user profile SHOW route
router.get("/users/:id", function(req, res){
   User.findById(req.params.id, function(err, foundUser){
       if(err){
           req.flash("error", "Cannot get user profile!");
           return res.redirect("back");
       }
       Campground.find().where("author.id").equals(foundUser._id).exec(function(err, foundUserCampgrounds){
            if(err){
               req.flash("error", "Something went wrong!");
               return res.redirect("back");
            }
            res.render("users/show", {user: foundUser, campgrounds: foundUserCampgrounds});
       });
   });
});

// user profile EDIT route
router.get("/users/:id/edit", middleware.checkUser, function(req, res){
   res.render("users/edit");
});

// user profile UPDATE route
router.put("/users/:id", middleware.checkUser, function(req, res){
   User.findByIdAndUpdate(req.params.id, req.body.user, function(err, updatedUser){
      if(err){
          req.flash("error", "Something went wrong!");
          return res.redirect("back");
      } 
      res.redirect("/users/" + req.params.id);
   });
});
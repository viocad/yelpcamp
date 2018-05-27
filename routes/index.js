var express         = require("express"),
    router          = express.Router(),
    User            = require("../models/user"),
    Campground      = require("../models/campground"),
    middleware      = require("../middleware"),
    async           = require("async"),
/*    nodemailer      = require("nodemailer"),
    crypto          = require("crypto"),*/ // comes with node, dun need to install
    passport        = require("passport"),
    multer          = require("multer"),
    cloudinary      = require("cloudinary"),
    Recaptcha       = require("express-recaptcha").Recaptcha;
    
var recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);

// multer configuration
var storage = multer.diskStorage({
        filename: function(req, file, callback){
            callback(null, Date.now() + file.originalname);
        }
    });
    
var imageFilter = function(req, file, cb){
    // filter the file uploaded by users... allow image formats only
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return cb (new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};

var upload = multer({
    storage: storage,
    fileFilter: imageFilter
});

// cloudinary configuration
cloudinary.config({
    cloud_name: "viocad",
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

// ROOT ROUTE
router.get("/", function(req, res){
   res.render("landing");
});

// show register form
router.get("/register", recaptcha.middleware.render, function(req, res){
    res.render("register", {page: "register", captcha:res.recaptcha});
});

// handle sign up logic
router.post("/register", recaptcha.middleware.verify, middleware.checkcaptcha, async function(req, res){
    try{
        var uploadedImage = await cloudinary.v2.uploader.upload(req.file.path);
        req.body.avatar = uploadedImage.secure_url;
        req.body.avatarId = uploadedImage.public_id;
        
        var newUser = new User({
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            avatar: req.body.avatar,
            avatarId: req.body.avatarId,
            email: req.body.email
        });
        
        if(req.body.adminCode === "123456"){
            return newUser.isAdmin = true;
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
    } catch (err){
        req.flash("error", err.message);
        return res.redirect("back");       
    }

});

// show login form
router.get("/login", recaptcha.middleware.render, function(req, res){
    res.render("login", {page: "login", captcha:res.recaptcha}); 
});

// handle login logic
router.post("/login", recaptcha.middleware.verify, middleware.checkcaptcha, passport.authenticate("local", 
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
    User.findById(req.params.id, async function(err, foundUser){
        if(err){
           req.flash("error", "Something went wrong!");
           res.redirect("back");
        } else{
            if(req.file){
                try{
                    await cloudinary.v2.uploader.destroy(foundUser.avatarId);
                    var updatedImage = await cloudinary.v2.uploader.upload(req.file.path);
                    req.body.avatarId = updatedImage.public_id;
                    req.body.avatar = updatedImage.secure_url;
                } catch(err){
                   req.flash("error", err.message);
                   return res.redirect("back");                    
                }
            }
            foundUser = req.body.user;
            foundUser.save();
            req.flash("success", "Successfully updated profile.");
            res.redirect("/users/" + req.params.id);
        }
    });
});




/*// user forgot password GET route
router.get("/forgot", function(req, res){
   res.render("forgot");
});

// user forgot password POST route
router.post("/forgot", function(req, res){
    async.waterfall([ // array of functions to avoid having too many callbacks
    
        // generate a token for user to reset password
        function(done){
           crypto.randomBytes(20, function(err, buf){
              var token = buf.toString("hex");
              done(err, token);
           }); 
        },
        
        // find user using email
        function(token, done){
            User.findOne({email: req.body.email}, function(err, user){
                if(err || !user){
                    req.flash("error", "No account with that email exists.");
                    return res.redirect("/forgot");
                }
                user.resetPasswordToken = token; 
                user.resetPasswordExpires = Date.now() + 3600000; //set token to expire after an hour (3600000ms)
                user.save(function(err){
                    done(err, token, user);
                });
            });
        },
        
        // send user an email that contains the token
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({ // nodemailer allows us to send emails
               service: "Gmail", // can be gmail, godaddy, etc
               auth: {
                   XOAuth2:{
                       user: "shihtzupudding@gmail.com",
                       clientId: "email-1013@round-reality-204810.iam.gserviceaccount.com",
                       clientSecret: "2d366154154f81ce1803e540dd3d97a2213d830c",
                       refreshToken: "1/VfUVKqb3S5Bff5WtAPdG96MXmh1CcZ8R4dHgkrROQXE"
                   }
               }
            });
            var mailOptions = {
                to: user.email,
                from: "shihtzupudding@gmail.com",
                subject: "YelpCamp Password Reset",
                text: "You are receiving this email because you (or someone else) have requested the reset of the password of " + user.username + "on YelpCamp. Please click on the following link, or paste the link into your browser to complete the process to reset your password" + "\n"
                    + "http://" + req.headers.host + "/reset/" + token + "\n\n"
                    + "If you did not request this, please ignore this email and your password will remain unchanged."
            }
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
                done(err, "done");
            });
        }
        
    ], function(err){
        if(err){
            req.flash("error", "Something went wrong!");
            res.redirect("/forgot");
            return console.log(err);
        }
        res.redirect("/forgot");
    });
});

// user reset password GET route
router.get("/reset/:token", function(req, res){
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now() }}, function(err, user){
        if(err || !user){
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot");
        }
        res.render("reset", {token: req.params.token});
    });
});

// user reset password POST route
router.post("/reset/:token", function(req, res){
    async.waterfall([
        function(done){
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now() }}, function(err, user){
                if(err || !user){
                    req.flash("error", "Password reset token is invalid or has expired.");
                    return res.redirect("/forgot");
                }
                // confirm password
                if(req.body.password === req.body.confirm){
                    user.setPassword(req.body.password, function(err){
                       user.resetPasswordToken = undefined;
                       user.resetPasswordExpires = undefined;
                       // update user to the db
                       user.save(function(err){
                           // log the user in
                           req.logIn(user, function(err){
                               done(err, user);
                           });
                       });
                    });
                } else {
                    req.flash("error", "Passwords do not match.");
                    return res.redirect("back");
                }
            });
        },
        function(user, done){
            var smtpTransport = nodemailer.createTransport({
               service: "Gmail", // can be gmail, godaddy, etc
               auth: {
                   XOAuth2:{
                       user: "shihtzupudding@gmail.com",
                       clientId: "email-1013@round-reality-204810.iam.gserviceaccount.com",
                       clientSecret: "2d366154154f81ce1803e540dd3d97a2213d830c",
                       refreshToken: "1/VfUVKqb3S5Bff5WtAPdG96MXmh1CcZ8R4dHgkrROQXE"
                   }
               }
            });
            var mailOptions = {
                to: user.email,
                from: "shihtzupudding@gmail.com",
                subject: "Your password has been changed",
                text: "Hello, \n\n" + "This is a confirmation that the password for your account " + user.email + " has just been changed."
            }
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash("success", "Your password has been changed.");
                done(err);
            });
        }
    ], function(err){
        res.redirect("/campgrounds");
    });
});*/
var express         = require("express"),
    router          = express.Router(), // creating a variable router. then add all the routes to router, instead of app.js. later require the router (export value) from app.js
    Campground      = require("../models/campground"),
    middleware      = require("../middleware"),
    NodeGeocoder    = require("node-geocoder");
    
var options = {
    provider: "here",
    appId: process.env.APP_ID,
    appCode: process.env.APP_CODE
    // the APP_ID and APP_CODE are stored in the .env file to stay behind the scene, the key used here has no restriction so that our app can access it from backend
    // the .env file then gets hidden using .gitignore file if we are using git
}

var geocoder = NodeGeocoder(options);

// INDEX ROUTE: show all campgrounds
router.get("/", function(req, res){ // instead of app.get, changed to route.get because we are using express.Router
// as we add "/campgrounds" in the app.use in app.js file, we can simply all routes here
    // get all campgrounds from DB
    Campground.find({}, function(err, allCampgrounds){
       if(err){
           console.log(err);
       } else{
           res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"}); 
       }
    });
});

// CREATE ROUTE: add new campground to DB
router.post("/", middleware.isLoggedIn, function(req, res){
    // get data from form and add to campgrounds array
    var name = req.body.name;
    var image = req.body.image;
    var price = req.body.price;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    geocoder.geocode(req.body.location, function(err, data){
        // this will code the address into latitude and longitude
        if(err || !data.length){
           req.flash("error", "Invalid address.");
           return res.redirect("back");
        } 
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;
        var newCampground = {name: name, price: price, image: image, description: desc, location: location, lat: lat, lng: lng, author: author};
        // create a new campground and save to DB
        Campground.create(newCampground, function(err, newlyCreated){
            if(err){
               req.flash("error", err.message);
               res.redirect("back");
            } else {
                // redirect back to campgrounds page
                req.flash("success", "Successfully added campground!")
                res.redirect("/campgrounds");
            }
        });
    });

});

// NEW ROUTE: show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

// SHOW ROUTE: show more info about one campground
// careful with /:id, if /new is defined after this route, it will be treated as /:id
router.get("/:id", function(req, res){
    // find the campground with provided id
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
            req.flash("error", "Sorry, that campground does not exist.");
            return res.redirect("/campgrounds");
        } 
        // render show template with that campground
        res.render("campgrounds/show", {campground: foundCampground});
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    res.render("campgrounds/edit", {campground: req.campground});
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
    geocoder.geocode(req.body.campground.location, function(err, data){
        if(err || !data.length){
            req.flash("error", "Invalid address.");
            return res.redirect("back");
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        // find and update the correct campground
        Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
            if(err){
                res.redirect("/campgrounds");
            } else {
                // redirect somewhere (show page)
                res.redirect("/campgrounds/" + req.params.id);
            }
        });
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/campgrounds");
        } else{
            res.redirect("/campgrounds");
        }
    });
});

module.exports = router;
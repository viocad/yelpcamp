var express         = require("express"),
    router          = express.Router(), // creating a variable router. then add all the routes to router, instead of app.js. later require the router (export value) from app.js
    Campground      = require("../models/campground"),
    middleware      = require("../middleware"),
    NodeGeocoder    = require("node-geocoder"),
    multer          = require("multer"),
    cloudinary      = require("cloudinary"),
    async           = require("async");
    
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
}

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
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), "gi");
        Campground.find({name: regex}, function(err, allCampgrounds){
           if(err){
               console.log(err);
           } else{
               res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"}); 
           }
        });
    } else{
        Campground.find({}, function(err, allCampgrounds){
           if(err){
               console.log(err);
           } else{
               res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"}); 
           }
        });
    }
});

// CREATE ROUTE: add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res){
    geocoder.geocode(req.body.campground.location, async function(err, data){
        // this will code the address into latitude and longitude
        if(err || !data.length){
           req.flash("error", "Invalid address.");
           return res.redirect("back");
        } 
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        try {
        // use cloudinary to upload image
            var uploadedImage = await cloudinary.v2.uploader.upload(req.file.path);
            // req.file comes from multer
            // add cloudinary url for the image to the campground object
            req.body.campground.image = uploadedImage.secure_url;
            req.body.campground.imageId = uploadedImage.public_id;
            // add author to campground object
            req.body.campground.author = {
                id: req.user._id,
                username: req.user.username
            }
            // create a new campground and save to DB
            Campground.create(req.body.campground, function(err, newlyCreated){
                if(err){
                   req.flash("error", err.message);
                   res.redirect("back");
                } else {
                    // redirect back to campgrounds page
                    req.flash("success", "Successfully added campground!")
                    res.redirect("/campgrounds/" + newlyCreated.id);
                }
            });
        } catch (err){
                req.flash("error", err.message);
                return res.redirect("back");
        }
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
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), function(req, res){
    geocoder.geocode(req.body.campground.location, function(err, data){
        if(err || !data.length){
            req.flash("error", "Invalid address.");
            return res.redirect("back");
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;
        Campground.findById(req.params.id, async function(err, foundCampground){
           if(err){
               req.flash("error", err.message);
               return res.redirect("back");
           } else {
               if(req.file){
                   try {
                        await cloudinary.v2.uploader.destroy(foundCampground.imageId);
                        var updatedImage = await cloudinary.v2.uploader.upload(req.file.path);
                        req.body.campground.imageId = updatedImage.public_id;
                        req.body.campground.image = updatedImage.secure_url; 
                   } catch (err){
                       req.flash("error", err.message);
                       return res.redirect("back");
                   }
               }
            // find and update the correct campground
            Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
                if(err){
                    res.flash("success", "Successfully updated campground.")
                    res.redirect("/campgrounds");
                } else {
                    // redirect somewhere (show page)
                    res.redirect("/campgrounds/" + req.params.id);
                }
            });
            }
        });
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, async function(err, foundCampground){
        if(err){
           req.flash("error", err.message);
           return res.redirect("back");            
        }
        try {
            await cloudinary.v2.uploader.destroy(foundCampground.imageId);
            foundCampground.remove()
            req.flash("success", "A campground has just been deleted.")
            res.redirect("/campgrounds");
        } catch (err){
           req.flash("error", err.message);
           return res.redirect("back");
        }
    });
});

function escapeRegex(text){ // this will replace all symbols to "\\$&"
    return text.replace(/[-[\]{}()*+?.,\\^$!#\s]/g, "\\$&");
}

module.exports = router;
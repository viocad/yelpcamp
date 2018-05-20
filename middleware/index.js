var Campground      = require("../models/campground"),
    Comment         = require("../models/comment");

// all the middlewares go here
var middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function(req, res, next){
    // user logged in
    if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
            if(err || !foundCampground){
                req.flash("error", "Campground not found!");
                res.redirect("back");
            // user own the campground
            } else if(foundCampground.author.id.equals(req.user._id)){ // fronter is an ObjectID, latter is a string, so cannot do == or ===
                req.campground = foundCampground; // passing campground info out to the route
                // the .equal method comes with mongoose
                next();
            } else{
                req.flash("error", "You don't have permission to do that.");
                res.redirect("back");
            }
        });    
        // user not own the campground
    } else {
    // user not logged in
        req.flash("error", "You need to be logged in to do that."); 
        res.redirect("back"); // take the user back to where they came from
    }
}

middlewareObj.checkCommentOwnership = function(req, res, next){
    // user logged in
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment){
                req.flash("error", "Comment not found!");
                res.redirect("back");
            // user own the comment
            } else if(foundComment.author.id.equals(req.user._id)){ 
                req.comment = foundComment;
                next();
            } else{
                req.flash("error", "You don't have permission to do that.");
                res.redirect("back");
            }
        });    
        // user not own the comment
    } else {
    // user not logged in
        req.flash("error", "You need to be logged in to do that."); 
        res.redirect("back"); // take the user back to where they came from
    }
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You need to be logged in to do that."); // use "success" for green color and "error" for red color (nth with bootstrap, it's our own key, it can be whatever word)
    // adding req.flash before res.redirect will not show flash right away.. this line will allow us to pass in the flash message to /login in this case when we render /login
    // next step: go to app.js and pass in the message to all routes using res.locals
    res.redirect("/login");
}


module.exports = middlewareObj
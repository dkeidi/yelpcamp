var express    = require("express");
var router 	   = express.Router();
var Campground = require("../models/campground");
var Comment    = require("../models/comment");
var middleware = require("../middleware");

//INDEX - show all campgrounds from db then render
router.get("/", function(req, res){
	var noMatch = null;
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), "gi");
		//Get searched campgrounds from DB
		Campground.find({name: regex}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				if(allCampgrounds.length < 1){
					noMatch = "No campgrounds match that query, please try again.";
				}
				res.render("campgrounds/index", {campgrounds: allCampgrounds, noMatch: noMatch});
			}
		});
	} else {
		Campground.find({}, function(err, allCampgrounds){
			if(err){
				console.log(err);
			} else {
				res.render("campgrounds/index", {campgrounds: allCampgrounds, page: 'campgrounds', noMatch: noMatch});
			}
		});		
	}
});

//CREATE - logic of adding new campgrounds and displaying instantly
router.post("/", middleware.isLoggedIn, function(req, res){
	//get data from form and add to campgrounds array
	var name = req.body.name;
	var price = req.body.price;
	var image = req.body.image;
	var desc = req.body.description;
	var author = {
		id: req.user._id,
		username: req.user.username
	}

	var newCampground = {name: name, price: price, image: image, description: desc, author: author};
	//create campground and save to database
	Campground.create(newCampground, function(err, newlyCreated){
		if(err){
			req.flash("error", "Something went wrong.");
			console.log(err);
		}else {
			//redirect back to campgrounds page
			console.log(newlyCreated);
			req.flash("success", "Campground pitched!");
			res.redirect("/campgrounds");
		}
	});
});

//NEW - show form for adding new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

//SHOW - show more info about 1 campground
router.get("/:id", function(req, res){
	//find campground with provided ID
	Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
		if(err || !foundCampground){
			console.log(err);
			req.flash("error", "Sorry, that campground do not exist!");
			return res.redirect("/campgrounds");
		} else {
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});

//EDIT - show edit form for campground
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
		//render edit template with that campground
		res.render("campgrounds/edit", {campground: req.campground});
});

//UPDATE - put campground
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
		if(err){
			res.redirect("back");
		} else {
			req.flash("success", "Campground updated.");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

//DESTROY campground
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res, next){
	Campground.findById(req.params.id, function(err, foundCampground){
		Comment.remove({
			"_id": {
				$in: foundCampground.comments
			}
		}, function(err){
			if(err){
				return next(err);
			}
			foundCampground.remove();
			req.flash("success", "Campground unpitched!");
			res.redirect("/campgrounds");
		});
	});
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
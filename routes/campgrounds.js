var express    = require("express");
var router 	   = express.Router();
var Campground = require("../models/campground");
var Comment    = require("../models/comment");
var middleware = require("../middleware");
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
  	//create custom filename for upload image
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_ID, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


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
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res){
	cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
		if(err){
			req.flash("error", err.message);
			console.log(err);
			return res.redirect("back");
		}

  		// add cloudinary url for the image to the campground object under image property
  		req.body.campground.image = result.secure_url;
  		req.body.campground.imageId = result.public_id;

  	  	// add author to campground
  		req.body.campground.author = {
			id: req.user._id,
			username: req.user.username
		};

		//create campground and save to database
		Campground.create(req.body.campground, function(err, campground){
			if(err){
				req.flash("error", err.message);
				console.log(err);
				return res.redirect("back");
			}else {
				//redirect back to campgrounds page
				req.flash("success", "Campground pitched!");
				res.redirect("/campgrounds/" + campground.id);
			}
		});
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
router.put("/:id", upload.single('image'), middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.file) {
				try {
					//housekeeping - destroy the current image on cloudinary before uploading new one
					await cloudinary.v2.uploader.destroy(campground.imageId);
					var result = await cloudinary.v2.uploader.upload(req.file.path);
					campground.imageId = result.public_id;
					campground.image = result.secure_url;
				} catch(err){
					req.flash("error", err.message);
					res.redirect("back");
				}
			}
			
			campground.name = req.body.campground.name;
			campground.price = req.body.campground.price;
			campground.description = req.body.campground.description;
			campground.save();
			req.flash("success", "Campground updated.");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

//DESTROY campground
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res, next){
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		}

		try {
			await cloudinary.v2.uploader.destroy(campground.imageId);
			campground.remove();
			req.flash("success", "Campground unpitched!");
			res.redirect("/campgrounds");
		} catch(err) {
			req.flash("error", err.message);
			return res.redirect("back");
		}
	});
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
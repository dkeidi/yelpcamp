var express 	   = require("express"),
	app 		   = express(),
	bodyParser 	   = require("body-parser"),
	mongoose 	   = require("mongoose"),
	flash		   = require("connect-flash"),
	passport 	   = require("passport"),
	LocalStrategy  = require("passport-local"),
	methodOverride = require("method-override");
	Campground 	   = require("./models/campground"),
	Comment 	   = require("./models/comment"),
	User 		   = require("./models/user"),
	seedDB 		   = require("./seeds");

//requiring routes
var commentRoutes 	 = require("./routes/comments"),
	campgroundRoutes = require("./routes/campgrounds"),
	indexRoutes 	 = require("./routes/index");

var url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp_v12";
// var url = "mongodb://localhost/yelp_camp_v13";
mongoose.connect(url, 
	{
		useNewUrlParser: true, 
	 	useUnifiedTopology: true,
		useFindAndModify: false
	});

// mongoose.connect("mongodb+srv://keidi:tay88888888@cluster0-w1eab.mongodb.net/test?retryWrites=true&w=majority", 
// 	{
// 		useNewUrlParser: true, 
// 	 	useUnifiedTopology: true,
// 		useFindAndModify: false
// 	});



app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
// seedDB(); //seed the database
app.locals.moment = require("moment");

// PASSPORT CONFIGURATION
app.use(require("express-session")({
	secret: "apple is the best",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//parse in login user either undefined or current login user
//pages can access currentUser variable
app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);


var port = process.env.PORT || 3000;
app.listen(port, function(){
	console.log("Lezzgo camping!");
});
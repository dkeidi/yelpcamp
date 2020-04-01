var mongoose = require("mongoose");

//schema set up
var campgroundSchema = new mongoose.Schema({
	name: String,
	price: String,
	image: String,
	imageId: String,
	description: String,
	createdAt: {
		type: Date,
		default: Date.now
	},
	author: {
		id: {
			type:mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		}
	]
});

campgroundSchema.pre("remove", async function(next) {
	try{
		await Comment.remove({
			"_id": {
				$in: this.comments
			}
		});
		next();
	} catch(err){
		next(err);
	}
});

//create a model
module.exports = mongoose.model("Campground", campgroundSchema);
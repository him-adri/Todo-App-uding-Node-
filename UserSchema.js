const mongoose = require("mongoose");
const schema = mongoose.Schema;

const UserSchema = new schema({
    name:{
        type: String,
    },
    email:{
        type: String
    },
    username:{
        type: String,
    },
    phonenumber:{
        type: Number,
    },
    password: {
        type: String,
    },
})

module.exports = mongoose.model("users", UserSchema);
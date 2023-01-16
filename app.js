const { urlencoded } = require("express");
const express = require("express");
const mongoose = require("mongoose");
const UserSchema = require("./UserSchema");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongooseDBSession = require("connect-mongodb-session")(session);
const jwt = require("jsonwebtoken");
const isAuth = require("./middleware/isAuth");
const rateLimiting = require("./middleware/rateLimiting");
const {
  validateDetails,
  jwtSign,
} = require("./utils/Authentication");
const TodoModel = require("./models/TodoModel");

const app = express();

app.set("view engine", "ejs");

mongoose.set("strictQuery", false);
const URL = `mongodb+srv://HimadriDas:himadri12@cluster0.hkllkvq.mongodb.net/todo_app`;
mongoose
  .connect(URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((res) => {
    console.log("Database Connected Successfully");
  })
  .catch((err) => {
    console.log("Database Connection Failed", err);
  });

app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(express.static("public"));

const store = new mongooseDBSession({
  uri: URL,
  collection: "sessions",
});

app.use(
  session({
    secret: "hello todo app",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.get("/", (req, res) => {
  return res.render("home");
});

app.get("/register", (req, res) => {
  return res.render("register");
});
app.get("/login", (req, res) => {
  return res.render("login");
});

app.post("/register", async (req, res) => {
  console.log(req.body);
  const { name, email, username, phonenumber, password } = req.body;
  try {
    await validateDetails(name, email, username, phonenumber, password);
  } catch (err) {
    return res.send({
      status: 400,
      message: "The user is not resgisterd",
    });
  }
  const hashedPassword = await bcrypt.hash(password, 7);
  let user = new UserSchema({
    name: name,
    email: email,
    username: username,
    phonenumber: phonenumber,
    password: hashedPassword,
    emailAuthenticated: false,
  });

  let userExists;
  try {
    userExists = await UserSchema.findOne({ email });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal Server Error",
      error: err,
    });
  }
  if (userExists) {
    return res.send({
      status: 400,
      message: `${username} already exists`,
    });
  }
  const verificationToken = jwtSign(email);
  console.log(verificationToken);
  try {
    const userDB = await user.save();
    console.log(userDB);

    return res.send({
      status: 200,
      message: `${name} successfully registered`,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal Server Error, Please try after some time",
      error: err,
    });
  }
});
app.get("/verifyEmail/:id", (req, res) => {
  const token = req.params.id;
  jwt.verify(token, "hello todo app", async (err, verifiedJWT) => {
    if (err) res.send(err);
    console.log(verifiedJWT, "Verified JWT");

    const userDB = await UserSchema.findOneAndUpdate(
      { email: verifiedJWT.email },
      { emailAuthenticated: true }
    );
    console.log(userDB);
    if (userDB) {
      return res.status(200).redirect("/login");
    } else {
      return res.send({
        status: 400,
        message: "Invalid Session Link",
      });
    }
  });
  return res.status(200);
});
app.post("/login", async (req, res) => {
  // console.log(req.body);
  const { email, password } = req.body;
  console.log(req.body);

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return res.send({
      status: 400,
      message: "Invalid Data",
    });
  }

  let userDB;
  try {
    if (email) {
      userDB = await UserSchema.findOne({ email: email });
    } else {
      userDB = await UserSchema.findOne({ username: email });
    }
    console.log(userDB, "userDB LOGIN");

    const isMatch = await bcrypt.compare(password, userDB.password);
    if (!isMatch) {
      return res.send({
        status: 400,
        message: "Password doesnot match",
        data: req.body,
      });
    }

    if (!userDB) {
      return res.send({
        status: 200,
        message: "User not registered. Register first and then login",
      });
    }

    if (userDB.emailAuthenticated === false) {
      return res.send({
        status: 400,
        message: "Please Verify your mail Id",
      });
    }
    (req.session.isAuth = true),
      (req.session.user = {
        username: userDB.username,
        email: userDB.email,
        userId: userDB._id,
      });
    res.redirect("/dashboard");
  } catch (err) {
    return res.send({
      status: 400,
      message: "Internal Server error",
      error: err,
    });
  }
});

app.get("/dashboard", async (req, res) => {
  res.render("dashboard");
});

app.post("/pagination_dashboard", isAuth, async (req, res) => {
  const skip = req.query.skip || 0;
  const LIMIT = 5;
  const username = req.session.user.username;

  try {
    let todos = await TodoModel.aggregate([
      { $match: { username: username } },
      {
        $facet: {
          data: [{ $skip: parseInt(skip) }, { $limit: LIMIT }],
        },
      },
    ]);

    return res.send({
      status: 200,
      message: "Read Successfully",
      data: todos,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "dataBase Error. Please try after some time",
      error: err,
    });
  }
});

app.post("/create-item", isAuth, rateLimiting, async (req, res) => {
  console.log(req.body, "Todo");
  const todoText = req.body.todo;

  if (!todoText) {
    return res.send({
      status: 400,
      message: "Missing Parameters",
    });
  }

  if (todoText.length > 100) {
    return res.send({
      status: 400,
      message: "Todo text is very long. Max 100 characters allowed.",
    });
  }

  let todo = new TodoModel({
    todo: todoText,
    username: req.session.user.username,
  });
  console.log(todo, "Todo Model");
  try {
    const todoDb = await todo.save();
    return res.send({
      status: 200,
      alert: "Todo created successfully",
      data: todoDb,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Database error, Please Try again.",
    });
  }
});

app.post("/edit-item", isAuth, async (req, res) => {
  const id = req.body.id;
  const newData = req.body.newData;
  console.log(req.body);
  if (!id || !newData) {
    return res.send({
      status: 404,
      message: "Missing Paramters.",
      error: "Missing todo data",
    });
  }

  try {
    const todoDb = await TodoModel.findOneAndUpdate(
      { _id: id },
      { todo: newData }
    );
    return res.send({
      status: 200,
      message: "Updated todo succesfully",
      data: todoDb,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Database error, Please Try again.",
      error: err,
    });
  }
});

app.post("/delete-item", isAuth, async (req, res) => {
  const id = req.body.id;
  console.log(req.body);
  if (!id) {
    return res.send({
      status: 404,
      message: "Missing parameters",
      error: "Missing id of todo to delete",
    });
  }

  try {
    const todoDb = await TodoModel.findOneAndDelete({ _id: id });

    return res.send({
      status: 200,
      message: "Todo Deleted Succesfully",
      data: todoDb,
    });
  } catch (err) {
    return res.send({
      status: 400,
      message: "Database error. Please try again.",
      error: err,
    });
  }
});
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/login");
  });
});
app.listen(8000, () => {
  console.log("Listening to port 8000");
});

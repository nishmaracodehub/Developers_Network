const express = require("express");
const router = express.Router();
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../../models/User");
const keys = require("../../config/keys");

//Load input validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

// @route   GET api/users/test
// @desc    Tests users route
// @access  Public
router.get("/test", (req, res) => res.json({ msg: "Users works" }));

// @route POST api/users/register
// @desc Register user
// @access Public

router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json({ errors });
  }

  const { name, email, password } = req.body;
  //looking for a email record of the user trying to register
  User.findOne({ email })
    .then(user => {
      if (user) {
        errors.email = "Email Already exists";
        res.status(400).json(errors);
      } else {
        //create gravatar
        const avatar = gravatar.url(email, {
          s: "200", //Size
          r: "pg", //rating
          d: "mm" //Default(no image)
        });
        // creating new user
        const newUser = new User({ name, email, avatar, password });

        bcrypt.genSalt(10, (err, salt) => {
          if (err) throw err;
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(user => res.json(user))
              .catch(err => console.log(err));
          });
        });
        console.log("New Registered User", newUser);
      }
    })
    .catch(err => console.log(err));
});

// @route POST api/users/login
// @desc login user / Returning JWT (Json Web Token)
// @access Public
router.post("/login", (req, res) => {
  //check login validation
  const { errors, isValid } = validateLoginInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json({ errors });
  }
  const { email, password } = req.body;

  //find the user by email
  User.findOne({ email }).then(user => {
    //check for user
    if (!user) {
      errors.email = "User not found";
      return res.status(400).json(errors);
    }
    //check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (!isMatch) {
        errors.password = "Password Incorrect";
        return res.status(400).json(errors);
      } else {
        // User Matched

        // create the jwt payload
        const payload = {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        };

        // Sign Token
        jwt.sign(
          payload,
          keys.secretOrKey,
          { expiresIn: 3600 },
          (err, token) => {
            if (err) throw err;
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      }
    });
  });
});

// @route POST api/users/current
// @desc return current user
// @access Private

router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    });
  }
);

module.exports = router;

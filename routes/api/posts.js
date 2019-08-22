const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

//Models
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");

//validation
const validatePostInput = require("../../validation/post");

// @route   GET api/posts/test
// @desc    Tests posts route
// @access  Public
router.get("/test", (req, res) => res.json({ msg: "Posts works" }));

// @route   GET api/posts
// @desc    GET posts
// @access  Public
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json({ nopostsfound: "No Posts Found" }));
});

// @route   GET api/post/:id
// @desc    GET post by id
// @access  Public
router.get("/:id", (req, res) => {
  Post.findById(req.params.id)
    .then(post => res.json(post))
    .catch(err =>
      res.status(404).json({ nopostfound: "No Post Found with that ID" })
    );
});

// @route   POST api/posts
// @desc    create post
// @access  Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    //check validation
    if (!isValid) {
      return res.status(404).json(errors);
    }

    const { text, name, avatar } = req.body;
    const newPost = new Post({
      text,
      name,
      avatar,
      user: req.user.id
    });

    newPost.save().then(post => res.json(post));
  }
);

// @route   DELETE api/posts/:id
// @desc    create post by id
// @access  Private
router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id).then(post => {
        //check for post user
        if (post.user.toString() !== req.user.id) {
          return res.status(401).json({ notauthorized: "User not authorized" });
        }

        //Delete
        post
          .remove()
          .then(() => res.json({ success: true }))
          .catch(() => res.status(404).json({ postnotfound: "No Post Found" }));
      });
    });
  }
);

// @route   POST api/posts/like/:id
// @desc    Like post
// @access  Private
router.post(
  "/like/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id).then(post => {
        if (
          post.likes.filter(like => like.user.toString() === req.user.id)
            .length > 0
        ) {
          res.status(400).json({ alreadyliked: "User already liked" });
        }

        //Add user id to likes array
        post.likes.unshift({ user: req.user.id });

        //save to db
        post
          .save()
          .then(post => res.json(post))
          .catch(err => res.status(404).json(err));
      });
    });
  }
);

// @route   POST api/posts/unlike/:id
// @desc    Unlike post
// @access  Private
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id).then(post => {
        if (
          post.likes.filter(like => like.user.toString() === req.user.id)
            .length === 0
        ) {
          return res
            .status(400)
            .json({ notliked: "You have not yet liked this post" });
        }

        //Get the remove index
        const removeIndex = post.likes
          .map(like => like.user.toString())
          .indexOf(req.user.id);

        //splice out of array
        post.likes.splice(removeIndex, 1);

        //save to db
        post
          .save()
          .then(post => res.json(post))
          .catch(err =>
            res.status(404).json({ postnotfound: "No Post Found" })
          );
      });
    });
  }
);

// @route   POST api/posts/comment/:id
// @desc    Add comment to post
// @access  Private
router.post(
  "/comment/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    //check validation
    if (!isValid) {
      return res.status(404).json(errors);
    }
    const { text, name, avatar } = req.body;
    Post.findById(req.params.id).then(post => {
      const newComment = {
        text,
        name,
        avatar,
        user: req.user.id
      };
      // Add comment to the post
      post.comments.unshift(newComment);
      //save the post to db
      post
        .save()
        .then(post => res.json(post))
        .catch(err => res.status(404).json({ nopost: "No Post Found" }));
    });
  }
);

// @route   POST api/posts/comment/:id/:comment_id
// @desc    Delete comment from post
// @access  Private
router.delete(
  "/comment/:id/:comment_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Post.findById(req.params.id).then(post => {
      //check to see if comment exists
      if (
        post.comments.filter(
          comment => comment._id.toString() === req.params.comment_id
        ).length === 0
      ) {
        return res
          .status(404)
          .json({ commentnotfound: "comment doesnot exist" });
      }

      // Get Remove index
      const removeIndex = post.comments
        .map(comment => comment._id.toString())
        .indexOf(req.params.comment_id);

      // Splice out of comments array
      post.comments.splice(removeIndex, 1);

      // save the post to db
      post
        .save()
        .then(post => res.json(post))
        .catch(err => res.json(err));
    });
  }
);

module.exports = router;

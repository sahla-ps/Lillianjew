const User = require("../../models/userSchema");

const userAuth = (req, res, next) => {
  if (req.session.User) {
    User.findById(req.session.User)
      .then((data) => {
        if (data && !data.isBlocked) {
          next();
        } else {
          res.redirect("/login");
        }
      })
      .catch((err) => {
        console.error("User authentication error:", err);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/login");
  }
};

const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
};

module.exports = {
  userAuth,
  adminAuth,
};

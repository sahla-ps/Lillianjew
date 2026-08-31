const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const e = require("express");

const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  } else {
    res.render("admin-login", { message: null });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        return res.redirect("/admin/login");
      }
    } else {
      return res.redirect("/admin/login");
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.redirect("/admin/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      res.render("dashboard");
    } catch (error) {
      console.error("Dashboard error:", error);
      return res.redirect("/admin/pageerror");
    }
  } else {
    res.redirect("/admin/login");
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("/admin/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.redirect("/admin/pageerror");
  }
};

module.exports = {
  loadLogin,
  login,
  logout,
  loadDashboard,
  pageerror,
};

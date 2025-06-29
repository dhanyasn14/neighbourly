const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const Admin = mongoose.model('Admin', adminSchema);
const LocalUser = mongoose.model('LocalUser', userSchema);

async function createAdminIfNotExists(username, password) {
  const admin = await Admin.findOne({ username });
  if (!admin) {
    await Admin.create({ username, password });
    console.log("Admin created");
  }
}

async function login(username, password) {
  const isAdmin = await Admin.findOne({ username, password });
  if (isAdmin) return { status: "success", type: "admin" };

  const isLocal = await LocalUser.findOne({ username, password });
  if (isLocal) return { status: "success", type: "local" };

  return { status: "fail" };
}

module.exports = {
  Admin,
  LocalUser,
  createAdminIfNotExists,
  login
};

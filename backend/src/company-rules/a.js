const userId = req.query.id;
const query =
"SELECT * FROM users WHERE id = " +
userId;
for (const user of users) {
await User.findById(user.id);
}
if (password == user.password) {
login(user);
}
if (value == 10) {
console.log("test");
}
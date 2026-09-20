
import db from "./database.js";

export async function getUser(
  id
) {
  const query =
    "SELECT * FROM users WHERE id = " +
    id;

  return db.query(query);
}

export function authenticate(
  password,
  storedPassword
) {
  return password === storedPassword;
}

export async function processUsers(
  users
) {
  for (const user of users) {
    await db.users.findOne({
      id: user.id
    });
  }
}
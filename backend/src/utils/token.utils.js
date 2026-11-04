import jwt from "jsonwebtoken";

const generateTokenAndSetCookie = (res, userID) => {
  const secretKey =
    process.env.Refresh_Secret_Key ||
    process.env.JWT_SECRET ||
    "Car-Rental-Secret-Key-123@";

  const uidStr = userID?.toString ? userID.toString() : String(userID);

  const refreshToken = jwt.sign(
    {
      userID: uidStr,
      userId: uidStr,
      id: uidStr,
    },
    secretKey,
    {
      expiresIn: "7d",
    }
  );

  if (res && typeof res.cookie === "function") {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  return refreshToken;
};

export default generateTokenAndSetCookie;

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import Auth from "../model/auth.model.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import { createFreeSubscription } from "../services/subscription.service.js";

function makeUniqueUsername(baseName) {
  const nameStr = String(baseName || "user");
  const cleaned = nameStr.replace(/\s+/g, "").toLowerCase() || "user";
  const randomNum = Math.floor(Math.random() * 10000);
  return `${cleaned}${randomNum}`;
}

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const port = process.env.PORT || 5000;
const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
const callbackURL =
  process.env.GOOGLE_CALLBACK_URL || `${backendUrl}/auth/google/callback`;

if (clientID && clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
      },
      async (_request, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const photo = profile.photos?.[0]?.value;
          const name = profile.displayName || "User";

          if (!email) return done(new Error("No email found in Google profile"), null);

          let user = await Auth.findOne({ email });

          if (user) {
            if (!user.googleId) {
              user.googleId = profile.id;
              user.provider = "google";
              user.Photo = user.Photo || photo;
              user.status = "active";
              user.isActive = true;
              await user.save();
            }
          } else {
            const username = makeUniqueUsername(name);
            user = await Auth.create({
              googleId: profile.id,
              provider: "google",
              email,
              userName: username,
              name,
              Photo: photo,
              status: "active",
              isActive: true,
              role: "member",
            });

            try {
              await createFreeSubscription(user._id);
            } catch (subErr) {
              console.warn("Could not create free subscription for google user:", subErr.message);
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

export const intro = (req, res) => {
  res.send("<a href='/auth/google'>Authenticate with Google</a>");
};

export const googleCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect("/fail");
  }

  const refreshToken = generateTokenAndSetCookie(res, req.user._id);
  req.user.sessionToken = refreshToken;
  await req.user.save();

  const frontendURL =
    process.env.FRONTEND_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5173";

  return res.redirect(`${frontendURL}/auth/callback?token=${refreshToken}`);
};

export const Profile = (req, res) => {
  res.send("Welcome " + (req.user?.name || req.user?.userName || "User"));
};

export const fail = (req, res) => {
  res.status(401).send("Failed to login with Google");
};

export default {
  intro,
  googleCallback,
  Profile,
  fail,
};

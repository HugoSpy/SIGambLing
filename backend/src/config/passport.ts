import passport from "passport";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { prisma } from "../lib/prisma";

interface MicrosoftProfile {
  id: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  _json?: any;
}

export function configurePassport() {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID!,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
        callbackURL: process.env.MICROSOFT_CALLBACK_URL!,
        scope: ["openid", "profile", "email", "User.Read"],
        tenant: process.env.MICROSOFT_TENANT_ID || "common",
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: MicrosoftProfile,
        done: (error: any, user?: any) => void,
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          const microsoftId = profile.id;

          if (!email) {
            return done(new Error("No email found in profile"));
          }

          if (!email.endsWith("@epita.fr")) {
            return done(new Error("Email must be @epita.fr"));
          }

          let user = await prisma.user.findUnique({
            where: { microsoftId },
          });

          if (!user) {
            const pseudo = email.split("@")[0].replace(".", "");

            user = await prisma.user.create({
              data: {
                email,
                microsoftId,
                pseudo,
                balance: 1000,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

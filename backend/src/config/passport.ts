import passport from "passport";
import { UserRole } from "@prisma/client";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { prisma } from "../lib/prisma";
import { buildPseudoFromEpitaEmail, ensureUniquePseudo } from "../utils/pseudo";

const EMAIL_WHITELIST = [
  "nicolasguerin@outlook.fr",
];

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
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const microsoftId = profile.id;

          if (!email) {
            return done(new Error("No email found in profile"));
          }

          if (!email.endsWith("@epita.fr") && !EMAIL_WHITELIST.includes(email)) {
            return done(new Error("Email must be @epita.fr"));
          }

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ microsoftId }, { email }],
            },
          });

          if (!user) {
            const pseudo = await ensureUniquePseudo(buildPseudoFromEpitaEmail(email), (candidate) =>
              prisma.user.findUnique({ where: { pseudo: candidate } }).then((existingUser) => existingUser !== null),
            );

            user = await prisma.user.create({
              data: {
                email,
                microsoftId,
                pseudo,
                balance: 1000,
                role: UserRole.user,
              },
            });
          } else if (user.microsoftId !== microsoftId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                microsoftId,
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

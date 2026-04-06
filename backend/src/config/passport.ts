import passport from "passport";
import { UserRole } from "@prisma/client";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { prisma } from "../lib/prisma";
import { buildPseudoFromEpitaEmail, ensureUniquePseudo } from "../utils/pseudo";
import { logger } from "../utils/logger";

function mask(value: string | undefined | null, visibleChars = 6): string {
  if (!value) return "<empty>";
  if (value.length <= visibleChars * 2) return `${value.slice(0, 3)}...`;
  return `${value.slice(0, visibleChars)}...${value.slice(-visibleChars)}`;
}

const P = "[MS_AUTH][PASSPORT]";

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
  logger.info(`${P}[INIT] Configuring Microsoft strategy`, {
    clientID: mask(process.env.MICROSOFT_CLIENT_ID),
    callbackURL: process.env.MICROSOFT_CALLBACK_URL,
    tenant: process.env.MICROSOFT_TENANT_ID || "common",
    scopes: ["openid", "profile", "email", "User.Read"],
  });

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
        logger.info(`${P}[VERIFY] Token exchange succeeded, profile received`, {
          profileId: profile.id,
          displayName: profile.displayName,
          emailCount: profile.emails?.length ?? 0,
          firstEmail: mask(profile.emails?.[0]?.value),
          hasJson: !!profile._json,
          accessTokenLength: _accessToken?.length ?? 0,
        });

        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const microsoftId = profile.id;

          if (!email) {
            logger.error(`${P}[VERIFY] No email found in profile`, {
              profileKeys: Object.keys(profile),
              profileJson: profile._json ? Object.keys(profile._json) : "none",
            });
            return done(new Error("No email found in profile"));
          }

          if (!email.endsWith("@epita.fr")) {
            logger.warn(`${P}[VERIFY] Email rejected (not @epita.fr)`, { email: mask(email) });
            return done(new Error("Email must be @epita.fr"));
          }

          logger.info(`${P}[DB_LOOKUP] Searching user...`, { email: mask(email), microsoftId: mask(microsoftId) });

          let user = await prisma.user.findFirst({
            where: {
              OR: [{ microsoftId }, { email }],
            },
          });

          if (!user) {
            logger.info(`${P}[DB_CREATE] User not found, creating...`, { email: mask(email) });

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
            logger.info(`${P}[DB_CREATE] User created`, { userId: user.id, pseudo: user.pseudo });
          } else if (user.microsoftId !== microsoftId) {
            logger.info(`${P}[DB_UPDATE] Linking microsoftId...`, { userId: user.id });

            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                microsoftId,
              },
            });
            logger.info(`${P}[DB_UPDATE] User updated`);
          } else {
            logger.info(`${P}[DB_LOOKUP] User found`, { userId: user.id, pseudo: user.pseudo });
          }

          return done(null, user);
        } catch (error: any) {
          logger.error(`${P}[VERIFY] EXCEPTION in verify callback`, {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: error.code,
          });
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

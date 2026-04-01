declare module "passport-microsoft" {
  import passport = require("passport");

  export interface MicrosoftProfileEmail {
    type: string;
    value: string;
  }

  export interface MicrosoftProfile {
    provider: "microsoft";
    id: string;
    displayName?: string;
    userPrincipalName?: string;
    emails?: MicrosoftProfileEmail[];
    name?: {
      familyName?: string;
      givenName?: string;
    };
    _raw: string;
    _json: {
      id: string;
      displayName?: string;
      givenName?: string;
      surname?: string;
      userPrincipalName?: string;
      mail?: string;
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    tenant?: string;
    authorizationURL?: string;
    tokenURL?: string;
    graphApiVersion?: string;
    addUPNAsEmail?: boolean;
    apiEntryPoint?: string;
  }

  export class Strategy extends passport.Strategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: MicrosoftProfile,
        done: (error: Error | null, user?: Express.User | false) => void,
      ) => void,
    );
  }
}

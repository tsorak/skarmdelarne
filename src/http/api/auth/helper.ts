import { Context } from "@hono/hono";
import * as jwt from "@emrahcom/jwt";

import { User } from "../auth.ts";
import { getCookie, setCookie } from "@hono/hono/cookie";

export interface CookieSpec {
  key: string;
  value: string;
  expires?: number;
}

function setCookies(
  c: Context,
  cookies: CookieSpec[],
) {
  for (const { key, value, expires } of cookies) {
    setCookie(c, key, value, {
      expires: expires ? new Date(expires) : undefined,
    });
  }
}

/**
 * uuid and nickname must be defined when making tokens.
 */
async function makeCookies(
  payload: Partial<User>,
  make: ("token" | "refresh_token" | "skarmdelarne_nickname")[],
) {
  const makeSet = new Set(make);

  const makeCookieSpecs = makeSet.keys().map((key) =>
    (async () => {
      let spec: CookieSpec;

      switch (key) {
        case "skarmdelarne_nickname":
          spec = { key, value: payload.nickname! };
          break;

        case "token": {
          const { nickname, uuid } = payload;

          const IN_ONE_WEEK = EXPIRES_IN.ONE_WEEK();

          const token = await jwt.create(
            { alg: "HS512", typ: "JWT" },
            { nickname, uuid, exp: IN_ONE_WEEK },
            SECRET,
          );

          spec = { key, value: token, expires: IN_ONE_WEEK };
          break;
        }

        case "refresh_token": {
          const { nickname, uuid } = payload;

          const IN_ONE_MONTH = EXPIRES_IN.ONE_MONTH();

          const token = await jwt.create(
            { alg: "HS512", typ: "JWT" },
            { nickname, uuid, exp: IN_ONE_MONTH },
            SECRET,
          );

          spec = { key, value: token, expires: IN_ONE_MONTH };
          break;
        }
      }

      return spec;
    })()
  );

  return await Promise.all(makeCookieSpecs);
}

const EXPIRES_IN = {
  ONE_WEEK: () => Date.now() + 60 * 60 * 24 * 7 * 1000,
  ONE_MONTH: () => Date.now() + 60 * 60 * 24 * 30 * 1000,
};

const SECRET = await (async () => {
  const secret = Deno.env.get("JWT_SECRET") ?? (() => {
    console.warn(
      "Environment variable 'JWT_SECRET' is not set, using default signing key",
    );
    return "i-hate-olives";
  })();

  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
  );

  return key;
})();

function getSession(c: Context) {
  return {
    key: function (s: string) {
      const cookie = getCookie(c, s);

      if (cookie) {
        return {
          and: {
            verifyJWT: async () => {
              try {
                return await jwt.verify<User>(cookie, SECRET);
              } catch {
                return null;
              }
            },
          },
        };
      }
    },
  };
}

export { EXPIRES_IN, getSession, makeCookies, SECRET, setCookies };

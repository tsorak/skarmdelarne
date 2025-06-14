import { Context, Hono } from "@hono/hono";
import { getCookie } from "@hono/hono/cookie";
import { validator } from "@hono/hono/validator";
import * as jwt from "@emrahcom/jwt";
import { z } from "zod";

import { makeCookies, SECRET, setCookies } from "./auth/helper.ts";

export interface User extends jwt.Payload {
  nickname: string;
  uuid: string;
}

const userSchema = z.object({
  nickname: z.string(),
});

export default function auth() {
  const app = new Hono();

  app.get("/", async (c) => {
    const token = getCookie(c, "token");

    let isTokenValid = false;
    if (token) {
      try {
        const { nickname } = await jwt.verify<User>(token, SECRET);

        // token and refresh_token stays httpOnly.
        // set skarmdelarne_nickname to let client JS know they have a valid session.
        const cookies = await makeCookies(
          { nickname },
          ["skarmdelarne_nickname"],
        );
        setCookies(c, cookies);

        isTokenValid = true;
      } catch (_e) {
        // Token is invalid
      }
    }

    if (isTokenValid) {
      return c.text("OK");
    }

    const refreshToken = getCookie(c, "refresh_token");

    let refreshTokenPayload;
    let isRefreshTokenValid = false;
    if (refreshToken) {
      try {
        refreshTokenPayload = await jwt.verify<User>(refreshToken, SECRET);
        isRefreshTokenValid = true;
      } catch {
        // Token is invalid
      }
    }

    if (isRefreshTokenValid) {
      const { nickname, uuid } = refreshTokenPayload!;

      const cookies = await makeCookies(
        { nickname, uuid },
        ["token", "refresh_token", "skarmdelarne_nickname"],
      );

      setCookies(c, cookies);

      return c.text("OK");
    }

    return c.newResponse("", 400);
  });

  // Creates a new session
  app.post("/", validator("json", validate), async (c) => {
    const v = c.req.valid("json");

    const nickname = v.nickname;
    const uuid = crypto.randomUUID();

    const cookies = await makeCookies(
      { nickname, uuid },
      ["token", "refresh_token", "skarmdelarne_nickname"],
    );

    setCookies(c, cookies);

    return c.text("OK");
  });

  return app;
}

function validate(v: unknown, c: Context) {
  const parsed = userSchema.safeParse(v);

  if (!parsed.success) {
    return c.newResponse("", 400);
  }

  return parsed.data;
}

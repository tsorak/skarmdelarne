import { Context, Hono } from "@hono/hono";
import { getCookie, setCookie } from "@hono/hono/cookie";
import { validator } from "@hono/hono/validator";

import * as jwt from "@gz/jwt";

import { z } from "zod";

const SECRET = Deno.env.get("JWT_SECRET") ?? (() => {
  console.warn(
    "Environment variable 'JWT_SECRET' is not set, using default signing key",
  );
  return "i-hate-olives";
})();

interface User {
  nickname: string;
  uuid: string;
}

const userSchema = z.object({
  nickname: z.string(),
  uuid: z.string().nullish(),
});

export default function auth() {
  const app = new Hono();

  app.get("/", async (c) => {
    const token = getCookie(c, "token");

    if (!token) return c.newResponse("", 400);

    try {
      const { _nickname, _uuid } = await jwt.decode<User>(token, SECRET);
      return c.text("OK");
    } catch {
      return c.newResponse("", 400);
    }
  });

  app.post("/", validator("json", validate), async (c) => {
    const v = c.req.valid("json");

    const nickname = v.nickname;
    const uuid = v.uuid ?? crypto.randomUUID();

    const ONE_WEEK = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
    const token = await jwt.encode({ nickname, uuid, exp: ONE_WEEK }, SECRET);

    setCookie(c, "token", token, {
      expires: new Date(ONE_WEEK),
      httpOnly: true,
    });

    setCookie(c, "skarmdelarne_nickname", nickname, {
      expires: new Date(ONE_WEEK),
    });

    setCookie(c, "skarmdelarne_uuid", uuid, {
      expires: new Date(ONE_WEEK),
    });

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

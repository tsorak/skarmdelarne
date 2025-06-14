import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";
import { cors } from "@hono/hono/cors";

import api from "./http/api.ts";
import client from "./http/client.ts";

export default function serve() {
  const defaults = new Hono();

  defaults.use(cors({
    origin: "http://localhost:3000",
    allowMethods: ["GET", "POST"],
    credentials: true,
  }));

  Deno.serve(app(defaults).fetch);
}

export async function serveHttps() {
  const [keyPath, certPath] = Deno.args;

  const [key, cert] = await Promise.all([
    Deno.readTextFile(keyPath),
    Deno.readTextFile(certPath),
  ]);

  Deno.serve({ key, cert, port: 8800 }, app().fetch);
}

function app(app = new Hono()) {
  app.use(logger());

  app.route("/", client());
  app.route("/api", api());

  return app;
}

import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";
import { cors } from "@hono/hono/cors";

import appState from "./http/appState.ts";
import api from "./http/api.ts";
import client from "./http/client.ts";

export default function serve() {
  Deno.serve(app().fetch);
}

export async function serveHttps() {
  const [keyPath, certPath] = Deno.args;

  const [key, cert] = await Promise.all([
    Deno.readTextFile(keyPath),
    Deno.readTextFile(certPath),
  ]);

  Deno.serve({ key, cert, port: 8800 }, app().fetch);
}

function app() {
  const app = new Hono();

  app.use(cors({
    origin: "*",
    allowMethods: ["GET"],
  }));

  app.use(async (_, next) => {
    appState.data.totalRequests += 1;
    await next();
  });

  app.use(logger());

  app.route("/", client());
  app.route("/api", api());

  return app;
}

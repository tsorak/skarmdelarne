import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";

import appState from "./http/appState.js";
import api from "./http/api.ts";
import client from "./http/client.ts";

export default function serve() {
  Deno.serve(app().fetch);
}

function app() {
  const app = new Hono();

  app.use(async (_, next) => {
    appState.data.totalRequests += 1;
    await next();
  });

  app.use(logger());

  app.route("/", client());
  app.route("/api", api());

  return app;
}

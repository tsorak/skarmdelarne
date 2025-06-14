import { Hono } from "@hono/hono";
import { serveStatic } from "@hono/hono/deno";

export default function client() {
  const app = new Hono();

  app.use("*", serveStatic({ root: "solid/dist/" }));

  app.use("/auth", serveStatic({ path: "solid/dist/index.html" }));

  return app;
}

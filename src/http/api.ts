import { Hono } from "@hono/hono";
import sse from "./api/sse.ts";
import client from "./api/client.ts";
import auth from "./api/auth.ts";

export default function api() {
  const app = new Hono();

  app.get("/", (c) => c.text("OK"));
  app.route("/sse", sse());
  app.route("/client", client());
  app.route("/auth", auth());

  return app;
}

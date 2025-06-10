import { Hono } from "@hono/hono";
import sse from "./api/sse.ts";
import client from "./api/client.ts";

export default function api() {
  const app = new Hono();

  app.get("/", (c) => c.text("OK"));
  app.route("/sse", sse());
  app.route("/client", client());

  return app;
}

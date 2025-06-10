import { Hono } from "@hono/hono";
import sse from "./api/sse.ts";

export default function api() {
  const app = new Hono();

  app.get("/", (c) => c.text("OK"));
  app.route("/sse", sse());

  return app;
}

import { Hono } from "@hono/hono";

export default function api() {
  const app = new Hono();

  app.get("/", () => new Response("OK"));

  return app;
}

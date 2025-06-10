import { Hono } from "@hono/hono";
import streaming from "./client/streaming.ts";

export default function client() {
  const app = new Hono();

  app.get("/", (c) => c.text("OK"));
  app.route("/streaming", streaming());

  return app;
}

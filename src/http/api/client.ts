import { Hono } from "@hono/hono";
import streaming from "./client/streaming.ts";
import askToWatch from "./client/askToWatch.ts";
import offer from "./client/offer.ts";
import answer from "./client/answer.ts";

export default function client() {
  const app = new Hono();

  app.get("/", (c) => c.text("OK"));
  app.route("/streaming", streaming());
  app.route("/askToWatch", askToWatch());
  app.route("/offer", offer());
  app.route("/answer", answer());

  return app;
}

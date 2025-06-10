import { Hono } from "@hono/hono";
import appState from "$/http/appState.ts";

export default function answer() {
  const app = new Hono();

  app.post("/", async (c) => {
    const { streamerId, viewerId, answer } = await c.req.json() as Payload;

    const target = appState.data.clients.get(streamerId);

    if (!target) return c.newResponse("", 400);

    await target.send({
      type: "answer",
      viewerId,
      answer,
    });

    return c.text("OK");
  });

  return app;
}

interface Payload {
  streamerId: string;
  viewerId: string;
  answer: { sdp: string; type: "answer" };
}

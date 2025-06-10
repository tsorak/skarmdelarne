import { Hono } from "@hono/hono";
import appState from "$/http/appState.ts";

export default function askToWatch() {
  const app = new Hono();

  app.post("/", async (c) => {
    const { streamerId, viewerId } = await c.req.json() as Payload;

    const target = appState.data.clients.get(streamerId);

    if (!target) return c.newResponse("", 400);

    await target.send({
      type: "askToWatch",
      viewerId,
    });

    return c.text("OK");
  });

  return app;
}

interface Payload {
  streamerId: string;
  viewerId: string;
}

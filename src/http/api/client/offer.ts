import { Hono } from "@hono/hono";
import appState from "$/http/appState.ts";

export default function offer() {
  const app = new Hono();

  app.post("/", async (c) => {
    const { viewerId, streamerId, offer } = await c.req.json() as Payload;

    const target = appState.data.clients.get(viewerId);

    if (!target) return c.newResponse("", 400);

    await target.send({
      type: "offer",
      streamerId,
      offer,
    });

    return c.text("OK");
  });

  return app;
}

interface Payload {
  viewerId: string;
  streamerId: string;
  offer: { sdp: string; type: "offer" };
}

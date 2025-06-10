import { Hono } from "@hono/hono";
import appState from "$/http/appState.ts";

// A streamer sends candidates to its viewers.

export default function candidate() {
  const app = new Hono();

  app.post("/", async (c) => {
    const { peerId, as, candidate } = await c.req.json() as Payload;

    const target = appState.data.clients.get(peerId);

    if (!target) return c.newResponse("", 400);

    await target.send({
      type: "candidate",
      as,
      candidate,
    });

    return c.text("OK");
  });

  return app;
}

interface Payload {
  peerId: string;
  as: string;
  candidate: object;
}

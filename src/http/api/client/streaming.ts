import { Hono } from "@hono/hono";
import appState from "$/http/appState.ts";

export default function streaming() {
  const app = new Hono();

  app.post("/", async (c) => {
    const { id, streaming: isStreaming } = await c.req.json() as Payload;

    const [updated, entry] = appState.clients().isStreaming(id, isStreaming);

    if (updated) {
      appState.clients().broadcast.modifyClient(entry);
    }

    return c.text("OK");
  });

  return app;
}

interface Payload {
  id: string;
  streaming: boolean;
}

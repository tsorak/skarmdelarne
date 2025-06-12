import { Hono } from "@hono/hono";
import { streamSSE } from "@hono/hono/streaming";
import { getCookie } from "@hono/hono/cookie";

import appState, { type Message } from "$/http/appState.ts";

export default function sse() {
  const app = new Hono();

  app.get(
    "/",
    (c) =>
      streamSSE(c, async (tx) => {
        const nickname = getCookie(c, "skarmdelarne_nickname");

        // The uuid the client wants to be known as.
        // It is what peers know eachother by.
        //
        // We have most likely set this as the server.
        // The reason we allow the user to have control over the uuid is
        // clients may lose connection and when they regain connection
        // everyones peer id-s should not change as it would cause ui updates
        // and break ongoing screensharing sessions.
        const uuid = getCookie(c, "skarmdelarne_uuid");

        if (!nickname || !uuid) {
          await tx.writeSSE({
            data: "Invalid skarmdelarne session. Goodbye",
          });
          tx.abort();
          return;
        }

        const who = uuid;

        const sendMsg = (m: Message) =>
          tx.writeSSE({ data: JSON.stringify(m) });

        sendMsg({
          type: "roomData",
          yourId: who,
          clients: appState.clients().toPublic(),
        });

        appState.clients().makeFrom(who, nickname, sendMsg);
        appState.clients().broadcast.clientUpdate({
          type: "clientUpdate",
          operation: "add",
          client: { id: who, name: nickname, streaming: false },
        });

        let alive = true;
        tx.onAbort(() => {
          appState.clients().remove(who);
          appState.clients().broadcast.clientUpdate({
            type: "clientUpdate",
            operation: "delete",
            client: { id: who, name: nickname, streaming: false },
          });
          alive = false;
        });

        while (alive) {
          await tx.writeln(": keep-alive");
          await tx.sleep(2000);
        }
      }),
  );

  return app;
}

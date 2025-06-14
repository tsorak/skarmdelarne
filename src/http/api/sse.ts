import { Hono } from "@hono/hono";
import { streamSSE } from "@hono/hono/streaming";

import appState, { type Message } from "$/http/appState.ts";

import { getSession } from "./auth/helper.ts";

export default function sse() {
  const app = new Hono();

  app.get(
    "/",
    (c) =>
      streamSSE(c, async (tx) => {
        const token = await getSession(c).key("token")?.and?.verifyJWT() ??
          null;

        if (!token) {
          await tx.writeSSE({
            data: "BAD_SESSION",
          });
          tx.abort();
          return;
        }

        const { uuid: who, nickname } = token;

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

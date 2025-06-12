import { produce } from "solid-js/store";

export default function handleSse(sscx, s) {
  sscx.on("roomData", ({ clients, yourId }) => {
    s.myId.set(yourId);

    // roomData should only trigger once per session.
    // The server has most likely restarted and the EventSource re-established connection.
    if (Object.keys(s.clients.v).length > 0) {
      return;
    }

    const entries = clients.map((v) => [v.id, v]);
    const obj = Object.fromEntries(entries);

    s.clients.mut(obj);
  });

  sscx.on("clientUpdate", ({ operation, client }) => {
    switch (operation) {
      case "modify": {
        let noLongerStreaming = false;
        s.clients.mut(
          client.id,
          produce((state) => {
            if (state.streaming && !client.streaming) {
              noLongerStreaming = true;
              delete state.stream;
            }

            state.name = client.name;
            state.streaming = client.streaming;
          }),
        );

        // If a client we were watching is not streaming anymore, cleanup
        if (noLongerStreaming) {
          // Exit early if were not watching the stream.
          const pc = sscx.peers[client.id]?.pc;
          if (!pc) return;

          // If we are not streaming to them, close the PeerConnection entirely.
          if ((s.clients.v[s.myId.get()]?.streaming == false) ?? true) {
            console.log(
              "Peer is not streaming to us and we are not streaming to them. Closing connection.",
            );
            pc.close();
            delete sscx.peers[client.id];
          }
        }
        break;
      }

      case "add":
        s.clients.mut(produce((state) => {
          state[client.id] = client;
        }));
        break;

      case "delete": {
        s.clients.mut(produce((state) => {
          delete state[client.id];
        }));

        sscx.removePeer(client.id);

        break;
      }

      default:
        break;
    }
  });

  sscx.on("askToWatch", ({ viewerId }) => {
    const myId = s.myId.get();
    const myScreen = s.clients.v[myId].stream;
    sscx.addPeer(viewerId, myScreen, myId);
  });

  sscx.on("offer", ({ offer, streamerId }) => {
    const myId = s.myId.get();

    const ontrack = (ev) => {
      s.clients.mut(
        streamerId,
        produce((state) => {
          console.log("Attaching remote stream", ev.streams[0]);
          state.stream = ev.streams[0];
        }),
      );
    };

    sscx.handleOffer(offer, streamerId, myId, ontrack);
  });

  sscx.on("answer", async ({ answer, viewerId }) => {
    await sscx.peers[viewerId].pc.setRemoteDescription(answer);
  });

  sscx.on("candidate", ({ candidate, as: peerId }) => {
    let retries = 0;
    // Sometimes a candidate is received before the RemoteDescription has been set.
    const retry = () => {
      try {
        sscx.peers[peerId].pc.addIceCandidate(candidate);
      } catch (_e) {
        setTimeout(() => {
          retries += 1;
          console.log("Retrying candidate. retries:", retries);
          retry();
        }, 100);
      }
    };

    retry();
  });
}

import { createEffect, createSignal, For, Show } from "solid-js";
import { createStore, produce } from "solid-js/store";

import { createCachedSignal } from "../util/cachedSignal.js";
import { useScreenshare } from "../context/screenshare.jsx";

import apiHelper from "./Room/apiHelper.js";

/** @import ../context/screenshare.jsx */

export default function Room(props) {
  const s = (() => {
    const [clients, mutClients] = createStore({});
    const [showNickInput, setShowNickInput] = createSignal(true);
    const [myId, setMyId] = createSignal("");

    return {
      nickname: createCachedSignal("skarmdelarne_nickname", ""),
      clients: {
        v: clients,
        mut: mutClients,
        values: () => Array.from(Object.values(clients)),
      },
      showNickInput: { get: showNickInput, set: setShowNickInput },
      myId: { get: myId, set: setMyId, cmp: (v) => myId() === v },
    };
  })();

  const sscx = useScreenshare();

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

  const handle = {
    setNickname: (ev) => {
      ev.preventDefault();

      document.cookie = `skarmdelarne_nickname=${s.nickname.get()}`;
      sscx.init();
      s.showNickInput.set(false);
    },
  };

  return (
    <main class="h-screen">
      <Show when={s.showNickInput.get()}>
        <form class="flex gap-2 p-1" onsubmit={handle.setNickname}>
          <p>Enter your nickname:</p>
          <input
            class="border-b-2 border-dotted focus:outline-none"
            type="text"
            autocomplete="off"
            spellcheck={false}
            name="nick_input"
            autofocus
            value={s.nickname.get()}
            oninput={(e) => s.nickname.set(e.target.value)}
          />
        </form>
      </Show>
      <div class="h-full flex flex-wrap justify-center items-center">
        <For each={s.clients.values()}>
          {(c) => <ClientCard c={c} s={s} />}
        </For>
      </div>
    </main>
  );
}

function ClientCard(props) {
  const { c: client, s } = props;

  return (
    <div
      class={`relative w-[480px] h-[270px] bg-black text-white flex flex-col`}
    >
      <Show when={!client.streaming} fallback={<StreamCard c={client} s={s} />}>
        <div class="flex justify-end">
          {s.myId.cmp(client.id) &&
            (
              <button
                type="button"
                class="cursor-pointer"
                onclick={async function () {
                  this.disabled = true;
                  const ok = await handleStartStream(client, s);

                  if (!ok) this.disabled = false;
                }}
              >
                Start streaming
              </button>
            )}
        </div>
        <div class="flex-grow flex flex-col justify-center items-center">
          <p class="text-3xl">{client.name}</p>
        </div>
        <div>
        </div>
      </Show>
    </div>
  );
}

function StreamCard(props) {
  const { c: client, s } = props;

  const isMe = s.myId.cmp(client.id);

  return (
    <>
      <Show when={s.clients.v[client.id]?.stream}>
        <video
          class="absolute z-10 w-full h-full"
          controls
          autoplay
          prop:srcObject={s.clients.v[client.id]?.stream || null}
        />
      </Show>
      <div class="absolute z-11 w-full h-full flex flex-col pointer-events-none">
        <div class="flex justify-between">
          <p class="w-min bg-[#0004]">{client.name}</p>
          <Show when={isMe}>
            <button
              type="button"
              class="cursor-pointer pointer-events-auto"
              onclick={function () {
                this.disabled = true;
                handleStopStream(client, s);
              }}
            >
              Stop streaming
            </button>
          </Show>
        </div>
        <div class="flex-grow flex flex-col justify-center items-center">
          <Show when={!isMe && !s.clients.v[client.id]?.stream}>
            <button
              type="button"
              class="cursor-pointer pointer-events-auto"
              onclick={function () {
                this.disabled = true;
                apiHelper.askToWatch(client.id, s.myId.get());
              }}
            >
              Watch
            </button>
          </Show>
        </div>
        <div>
        </div>
      </div>
    </>
  );
}

async function handleStartStream(my, s) {
  const [ok, screen] = await getScreen();

  if (!ok) return false;

  s.clients.mut(my.id, { stream: screen });

  const success = await apiHelper.setStreaming(my.id, true);
  console.log(
    success
      ? "Server knows we are streaming"
      : "Server rejected our *start* streaming status",
  );

  return success;
}

async function handleStopStream(my, s) {
  s.clients.mut(my.id, (state) => {
    state.stream.getTracks().forEach((track) => {
      track.stop();
    });

    return { ...state, stream: null };
  });

  const success = await apiHelper.setStreaming(
    my.id,
    false,
  );

  console.log(
    success
      ? "Server knows we stopped streaming"
      : "Server rejected our *stopped* streaming status",
  );
}

async function getScreen() {
  const media = navigator.mediaDevices;

  if (!media) {
    console.error(
      "NEED TO BE ON HTTPS OR LOCALHOST TO GET navigator.mediaDevices",
    );
    return [false, null];
  }

  let screen;

  try {
    screen = await media.getDisplayMedia({
      video: true,
      audio: true,
    });
  } catch (e) {
    console.error(e);
    return [false, null];
  }

  return [true, screen];
}

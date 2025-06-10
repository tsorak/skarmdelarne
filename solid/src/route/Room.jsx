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
    const entries = clients.map((v) => [v.id, v]);
    const obj = Object.fromEntries(entries);

    s.myId.set(yourId);
    s.clients.mut(obj);
  });

  sscx.on("clientUpdate", ({ operation, client }) => {
    switch (operation) {
      case "modify":
        s.clients.mut(
          client.id,
          produce((state) => {
            state.name = client.name;
            state.streaming = client.streaming;
          }),
        );
        break;
      case "add":
        s.clients.mut(produce((state) => {
          state[client.id] = client;
        }));
        break;
      case "delete":
        s.clients.mut(produce((state) => {
          delete state[client.id];
        }));
        break;

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
          state.stream = ev.streams[0];
          console.log("LOL", ev.streams);
        }),
      );
    };

    sscx.handleOffer(offer, streamerId, ontrack, myId);
  });

  sscx.on("answer", async ({ answer, viewerId }) => {
    await sscx.peers[viewerId].pc.setRemoteDescription(answer);
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
                onclick={function () {
                  this.disabled = true;
                  handleStartStream(client, s);
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

  if (!ok) return;

  console.log(screen);

  s.clients.mut(my.id, { stream: screen });

  const success = await apiHelper.setStreaming(my.id, true);
  console.log(
    success
      ? "Server knows we are streaming"
      : "Server rejected our *start* streaming status",
  );
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

  const screen = await media.getDisplayMedia({
    video: true,
    audio: true,
  });

  return [true, screen];
}

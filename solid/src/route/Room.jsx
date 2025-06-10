import { createEffect, createSignal, For, Show } from "solid-js";
import { createStore, unwrap } from "solid-js/store";

import { createCachedSignal } from "../util/cachedSignal.js";
import { useScreenshare } from "../context/screenshare.jsx";

import api from "../api.js";

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

  sscx.on("initialRoomData", (body) => {
    const entries = body.clients.map((v) => [v.id, v]);
    const obj = Object.fromEntries(entries);

    s.myId.set(body.yourId);
    s.clients.mut(obj);
  });

  sscx.on("clientUpdate", ({ client }) => {
    s.clients.mut(client.id, {
      name: client.name,
      streaming: client.streaming,
    });
  });

  // onMount(async () => {
  //   for await (const msg of cx.rx) {
  //     switch (msg.type) {
  //       case "clients":
  //       case "askToWatch":
  //       case "offer":
  //       case "answer":
  //       default:
  //         break;
  //     }
  //     console.log(msg);
  //   }
  // });

  // createEffect(() => {
  // });

  // onCleanup(() => {
  //   s.clients.mut({});
  // });

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

  return (
    <>
      <video
        class="absolute z-10 w-full h-full"
        controls
        autoplay
        prop:srcObject={s.clients.v[client.id]?.stream || null}
      />
      <div class="absolute z-11 w-full h-full flex flex-col pointer-events-none">
        <div class="flex justify-between">
          <p class="w-min bg-[#0004]">{client.name}</p>
          {s.myId.cmp(client.id) &&
            (
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
            )}
        </div>
        <div class="flex-grow flex flex-col justify-center items-center">
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

const apiHelper = {
  setStreaming: async (clientId, b) => {
    const resp = await fetch(`${api.base}/api/client/streaming`, {
      method: "POST",
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ id: clientId, streaming: b }),
    });

    return resp.ok;
  },
};

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

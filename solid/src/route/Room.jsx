import { createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";

import { createCachedSignal } from "../util/cachedSignal.js";
import { useScreenshare } from "../context/screenshare.jsx";

import apiHelper from "./Room/apiHelper.js";
import handleSse from "./Room/handleSse.js";
import { useSession } from "../context/session.jsx";

/** @import ../context/screenshare.jsx */

export default function Room(props) {
  const sscx = useScreenshare();

  const session = useSession();
  {
    const { ok, elseRedirect } = session.exists();

    if (ok) {
      sscx.init();
    } else {
      elseRedirect("/auth");
    }
  }

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

  handleSse(sscx, s);

  return (
    <main class="h-screen dark:bg-neutral-900 dark:text-neutral-300">
      <div class="h-full flex flex-wrap justify-center items-center gap-4 select-none">
        <For each={s.clients.values()}>
          {(c) => <ClientCard c={c} s={s} />}
        </For>
      </div>
    </main>
  );
}

function ClientCard(props) {
  const { c: client, s } = props;

  const isMe = s.myId.cmp(client.id);

  return (
    <div class="relative w-[480px] h-[270px] bg-black text-white flex flex-col shadow-xl/40">
      <Show when={!client.streaming} fallback={<StreamCard c={client} s={s} />}>
        <div class="flex justify-end mx-1">
          <Show when={isMe}>
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
          </Show>
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
        <div class="flex justify-between items-center">
          <p class="w-min bg-[#0004]">{client.name}</p>
          <div class="flex items-center mx-1 gap-1">
            <Show
              when={isMe}
              fallback={
                <div class="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              }
            >
              <button
                type="button"
                class="cursor-pointer pointer-events-auto flex items-center gap-1"
                onclick={function () {
                  this.disabled = true;
                  handleStopStream(client, s);
                }}
              >
                Stop streaming{" "}
                <div class="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              </button>
            </Show>
          </div>
        </div>
        <div class="flex-grow flex flex-col justify-center items-center">
          <Show when={!isMe && !s.clients.v[client.id]?.stream}>
            <button
              type="button"
              class="cursor-pointer pointer-events-auto bg-[#fff2] py-3 px-6 rounded-full hover:scale-[105%] hover:bg-[#fff3] active:bg-[#eee3] transition-all duration-250 text-xl"
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

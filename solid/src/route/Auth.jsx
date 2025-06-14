import { Match, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import cookie from "cookie.js";

import { useLoader } from "../context/loader.jsx";
import { useSession } from "../context/session.jsx";
import apiHelper from "./Room/apiHelper.js";
import Loader from "../component/generic/Loader.jsx";

export default function Auth(props) {
  const [state, mutState] = createStore({ phase: "welcome", bg: "#0000" });

  const controls = {
    setPhase: (p) => {
      switch (p) {
        case "loading":
          mutState({ phase: "loading", bg: "#2b7fff" });
          break;
        case "continueAs":
          mutState({ phase: "continueAs", bg: "#0b0" });
          break;
        case "welcome":
          mutState({ phase: "welcome", bg: "#0000" });
          break;
        default:
          break;
      }
    },
  };

  const loader = useLoader();
  const session = useSession();
  controls.setPhase("loading");

  session.ensureValid().then(({ ok }) => {
    if (ok) {
      controls.setPhase("continueAs");
    } else {
      controls.setPhase("welcome");
    }
  });

  const handle = {
    setNickname: async (ev) => {
      ev.preventDefault();

      const form = ev.target;

      const nickname = form["nick_input"].value;

      loader.show();
      await apiHelper.newSession(nickname);

      const { ok, andRedirect } = session.exists();
      loader.hide();
      if (ok) {
        andRedirect("/");
      } else {
        console.error("Error setting session");
      }
    },
  };

  return (
    <main class="h-screen dark:bg-neutral-900 dark:text-neutral-300 flex justify-center items-center">
      <form
        class="flex flex-col p-8 bg-neutral-100 dark:bg-neutral-700 rounded select-none"
        onsubmit={handle.setNickname}
      >
        <Header state={state} />

        <span class="text-center text-xs mt-4">
          {state.phase === "continueAs" ? "or" : "Join as"}
        </span>

        <label for="nick_input" class="relative mt-4">
          <input
            class="peer border-2 rounded border-neutral-700 dark:border-neutral-300 focus:outline-none p-1 w-52"
            type="text"
            autocomplete="off"
            id="nick_input"
            name="nick_input"
            required
            autofocus
          />
          <p class="peer-invalid:not-peer-focus:translate-y-[17px] absolute -top-[7px] text-xs ml-2 px-1 bg-neutral-100 dark:bg-neutral-700 transition-transform pointer-events-none">
            Nickname
          </p>
        </label>

        <button
          type="submit"
          class="rounded bg-blue-500 p-3 mt-8 cursor-pointer hover:scale-105 hover:bg-blue-400 active:bg-blue-600 transition-all focus:outline-none text-white"
        >
          Join!
        </button>
      </form>
    </main>
  );
}

function Header({ state }) {
  const navigate = useNavigate();

  return (
    <div
      class="rounded-md transition-colors h-12 flex justify-center items-center"
      style={{ background: state.bg }}
    >
      <Switch>
        <Match when={state.phase === "loading"}>
          <Loader class="animate-spin w-8 h-8 text-[#0000] fill-neutral-300" />
        </Match>

        <Match when={state.phase === "continueAs"}>
          <button
            type="button"
            class="cursor-pointer focus:outline-none w-full h-full text-center text-neutral-300"
            onclick={() => navigate("/", { replace: false })}
          >
            Continue as {cookie.get("skarmdelarne_nickname")}
          </button>
        </Match>

        <Match when={state.phase === "welcome"}>
          <h2 class="text-2xl">Welcome</h2>
        </Match>
      </Switch>
    </div>
  );
}

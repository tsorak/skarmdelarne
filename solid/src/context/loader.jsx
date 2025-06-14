import { createContext, createSignal, Show, useContext } from "solid-js";

import Loader from "../component/generic/Loader.jsx";

const LoaderContext = createContext();

export function LoaderProvider(props) {
  const [enable, setEnable] = createSignal(false);

  const state = {
    show: () => setEnable(true),
    hide: () => setEnable(false),
  };

  return (
    <LoaderContext.Provider value={state}>
      <Show when={enable()}>
        <div class="absolute w-screen h-screen flex justify-center items-center bg-white dark:bg-neutral-900 z-100">
          <div class="relative">
            <Loader />
          </div>
        </div>
      </Show>
      {props.children}
    </LoaderContext.Provider>
  );
}

/** @returns {{show: Function, hide: Function}} */
export function useLoader() {
  return useContext(LoaderContext);
}

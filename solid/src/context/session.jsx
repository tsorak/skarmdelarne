import { createContext, useContext } from "solid-js";
import { useNavigate } from "@solidjs/router";

import cookie from "cookie.js";
import apiHelper from "../route/Room/apiHelper.js";

class State {
  nickname;
  uuid;
  navigate;

  constructor() {
    this.navigate = useNavigate();
  }

  exists() {
    const nickname = cookie.get("skarmdelarne_nickname");

    if (!nickname) {
      return {
        ok: false,
        elseRedirect: (to) => this.navigate(to, { replace: false }),
        andRedirect: () => {},
      };
    }

    return {
      ok: true,
      elseRedirect: () => {},
      andRedirect: (to) => this.navigate(to, { replace: false }),
    };
  }

  async ensureValid() {
    const okResponse = await apiHelper.validSession();
    if (!okResponse) {
      return {
        ok: false,
        elseRedirect: (to) => this.navigate(to, { replace: false }),
        andRedirect: () => {},
      };
    }

    return {
      ok: true,
      elseRedirect: () => {},
      andRedirect: (to) => this.navigate(to, { replace: false }),
    };
  }
}

const SessionContext = createContext();

export function SessionProvider(props) {
  return (
    <SessionContext.Provider value={new State()}>
      {props.children}
    </SessionContext.Provider>
  );
}

/** @returns {State} */
export function useSession() {
  return useContext(SessionContext);
}

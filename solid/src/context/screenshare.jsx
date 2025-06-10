import { createContext, useContext } from "solid-js";

import api from "../api.js";

const ScreenshareContext = createContext();

export function ScreenshareProvider(props) {
  const state = {
    handlers: {},
    init: setupReceiver,
    on: handleMessage,
  };

  return (
    <ScreenshareContext.Provider value={state}>
      {props.children}
    </ScreenshareContext.Provider>
  );
}

/** @returns {{init: Function, _source: EventSource, on: typeof handleMessage }} */
export function useScreenshare() {
  return useContext(ScreenshareContext);
}

function setupReceiver() {
  if (this._source) {
    this._source.close();
  }

  const source = new EventSource(`${api.base}/api/sse`);

  source.addEventListener("message", (ev) => {
    const v = ev.data;

    /** @type {Message} */
    let msg;
    try {
      msg = JSON.parse(v);
    } catch (_e) {
      return;
    }

    const messageHandlers = this.handlers[msg.type];
    if (messageHandlers) {
      for (const h of messageHandlers) {
        h(msg);
      }
    }
  });

  this._source = source;
}

/**
 * @overload
 * @param {"roomData"} type
 * @param {(v: RoomData) => void} cb
 */
/**
 * @overload
 * @param {"askToWatch"} type
 * @param {(v: AskToWatch) => void} cb
 */
/**
 * @overload
 * @param {"offer"} type
 * @param {(v: Offer) => void} cb
 */
/**
 * @overload
 * @param {"answer"} type
 * @param {(v: Answer) => void} cb
 */
/**
 * @overload
 * @param {"clientUpdate"} type
 * @param {(v: ClientUpdate) => void} cb
 */
/**
 * @param {"roomData" | "askToWatch" | "offer" | "answer" | "clientUpdate"} type
 * @param {(v: Message) => void} cb
 */
function handleMessage(type, cb) {
  if (this.handlers[type]) {
    this.handlers[type].push(cb);
  } else {
    this.handlers[type] = [cb];
  }
}

/**
 * @typedef {RoomData | AskToWatch | Offer | Answer} Message
 *
 * @typedef {Object} RoomData
 * @property {"roomData"} type
 * @property {string} yourId
 * @property {{id: string, name: string, streaming: boolean}[]} clients
 *
 * @typedef {Object} AskToWatch
 * @property {"askToWatch"} type
 * @property {string} by
 *
 * @typedef {Object} Offer
 * @property {"offer"} type
 * @property {string} from
 * @property {{sdp: string, type: string}} offer
 *
 * @typedef {Object} Answer
 * @property {"answer"} type
 * @property {string} by
 * @property {{sdp: string, type: string}} answer
 *
 * @typedef {Object} ClientUpdate
 * @property {"clientUpdate"} type
 * @property {"add" | "modify" | "delete"} operation
 * @property {{id: string, name: string, streaming: boolean}} client
 */

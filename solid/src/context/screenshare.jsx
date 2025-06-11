import { createContext, useContext } from "solid-js";

import api from "../api.js";
import apiHelper from "../route/Room/apiHelper.js";

const ScreenshareContext = createContext();

export function ScreenshareProvider(props) {
  const state = {
    handlers: {},
    peers: {},
    init: setupReceiver,
    on: handleMessage,
    addPeer: async function (viewerId, myStream, myId) {
      let pc;

      if (this.peers[viewerId]) {
        pc = this.peers[viewerId].pc;
      } else {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
      }

      myStream.getTracks().forEach((track) => {
        pc.addTrack(track, myStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const success = apiHelper.sendOffer(offer, viewerId, myId);

      if (!pc.onicecandidate) {
        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            apiHelper.sendCandidate(ev.candidate, viewerId, myId);
          }
        };
      }

      this.peers[viewerId] = { pc };
      return success;
    },
    handleOffer: async function (offer, streamerId, ontrack, myId) {
      let pc;

      if (this.peers[streamerId]) {
        pc = this.peers[streamerId].pc;
      } else {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
      }

      if (!pc.ontrack) pc.ontrack = ontrack;

      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const success = apiHelper.sendAnswer(answer, streamerId, myId);

      if (!pc.onicecandidate) {
        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            apiHelper.sendCandidate(ev.candidate, streamerId, myId);
          }
        };
      }

      this.peers[streamerId] = { pc };
      return success;
    },
  };

  return (
    <ScreenshareContext.Provider value={state}>
      {props.children}
    </ScreenshareContext.Provider>
  );
}

/** @returns {{
 * init: Function,
 * _source: EventSource,
 * on: typeof handleMessage,
 * addPeer: (peerId: string, myStream: MediaStream, myId: string) => Promise<boolean>,
 * handleOffer: (offer: Object, streamerId: string, ontrack: (ev: Event) => void, myId: string) => Promise<boolean>,
 * peers: {[k: string]: { pc: RTCPeerConnection }}
 * }}
 */
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
 * @param {"candidate"} type
 * @param {(v: Candidate) => void} cb
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
 * @typedef {RoomData | AskToWatch | Offer | Answer | Candidate | ClientUpdate} Message
 *
 * @typedef {Object} RoomData
 * @property {"roomData"} type
 * @property {string} yourId
 * @property {{id: string, name: string, streaming: boolean}[]} clients
 *
 * @typedef {Object} AskToWatch
 * @property {"askToWatch"} type
 * @property {string} viewerId,
 *
 * @typedef {Object} Offer
 * @property {"offer"} type
 * @property {string} streamerId,
 * @property {{sdp: string, type: string}} offer
 *
 * @typedef {Object} Answer
 * @property {"answer"} type
 * @property {string} viewerId,
 * @property {{sdp: string, type: string}} answer
 *
 * @typedef {Object} Candidate
 * @property {"candidate"} type
 * @property {string} as,
 * @property {Object} candidate
 *
 * @typedef {Object} ClientUpdate
 * @property {"clientUpdate"} type
 * @property {"add" | "modify" | "delete"} operation
 * @property {{id: string, name: string, streaming: boolean}} client
 */

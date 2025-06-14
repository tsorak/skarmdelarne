import { cookie } from "cookie.js";

import api from "../../api.js";

const CREDENTIALS = import.meta.env.DEV ? "include" : "same-origin";

const apiHelper = {
  setStreaming: async (clientId, b) => {
    const resp = await fetch(`${api.base}/api/client/streaming`, {
      method: "POST",
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ id: clientId, streaming: b }),
    });

    return resp.ok;
  },
  askToWatch: async (streamerId, as) => {
    const resp = await fetch(`${api.base}/api/client/askToWatch`, {
      method: "POST",
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ streamerId, viewerId: as }),
    });

    return resp.ok;
  },
  sendOffer: async (offer, viewerId, as) => {
    const resp = await fetch(`${api.base}/api/client/offer`, {
      method: "POST",
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ viewerId, streamerId: as, offer }),
    });

    return resp.ok;
  },
  sendAnswer: async (answer, streamerId, as) => {
    const resp = await fetch(`${api.base}/api/client/answer`, {
      method: "POST",
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ streamerId, viewerId: as, answer }),
    });

    return resp.ok;
  },
  sendCandidate: async (candidate, peerId, as) => {
    const resp = await fetch(`${api.base}/api/client/candidate`, {
      method: "POST",
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ peerId, as, candidate }),
    });

    return resp.ok;
  },

  validSession: async () => {
    const resp = await fetch(`${api.base}/api/auth`, {
      credentials: CREDENTIALS,
    });

    return resp.ok;
  },

  newSession: async (nickname) => {
    const resp = await fetch(`${api.base}/api/auth`, {
      method: "POST",
      credentials: CREDENTIALS,
      headers: api.HEADER.CONTENT_JSON,
      body: JSON.stringify({ nickname }),
    });

    return resp.ok;
  },

  replaceSessionNickname: async (newNickname) => {
    cookie.set("skarmdelarne_nickname", newNickname);

    const resp = await fetch(`${api.base}/api/auth`, {
      method: "PATCH",
      credentials: CREDENTIALS,
    });

    return resp.ok;
  },
};

export default apiHelper;

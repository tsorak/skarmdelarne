import api from "../../api.js";

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
};

export default apiHelper;

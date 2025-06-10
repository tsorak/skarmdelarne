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
};

export default apiHelper;

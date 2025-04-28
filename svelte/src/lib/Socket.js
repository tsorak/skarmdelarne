export class Socket {
  /** @type {WebSocket} ws */
  ws;

  /** @type {Promise<void>} _is_connected */
  _is_connected;

  constructor(url) {
    this.ws = new WebSocket(url);

    let res, rej;
    this._is_connected = new Promise((resolve, reject) => {
      res = resolve;
      rej = reject;
    });

    this.on("open", () => {
      console.log("WebSocket connected");
      res();
    });
    this.on("error", (e) => {
      console.error(e);
      rej();
    });
    this.on("message", (v) => route(v));
    this.on("close", (c) => {
      console.log(c);
      rej();
    });
  }

  on(ev, cb) {
    this.ws.addEventListener(ev, cb);
  }

  offer(o) {
    this.send("offer", o);
  }

  async send(type, props) {
    const data = {
      type,
      props,
    };

    await this._is_connected;

    this.ws.send(JSON.stringify(data));
  }
}

function route(d) {
  try {
    d = JSON.parse(d);
  } catch (_e) {
    //
  }

  console.log(d);
}

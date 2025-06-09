export class Socket {
  /** @type {WebSocket} ws */
  ws;

  /** @type {Promise<void>} _is_connected */
  _is_connected;

  /** @type {Map<string, Function>} payloadHandlers */
  payloadHandlers;

  constructor(url) {
    this.ws = new WebSocket(url);
    this.payloadHandlers = new Map();

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
    this.on("message", (ev) => this.route(ev));
    this.on("close", (c) => {
      console.log(c);
      rej();
    });
  }

  /**
   * @param {string} ev
   * @param {Function} cb
   */
  on(ev, cb) {
    if (["open", "error", "message", "close"].includes(ev)) {
      this.ws.addEventListener(ev, cb);
    } else {
      this.payloadHandlers.set(ev, cb);
    }
  }

  route(ev) {
    const msg = parseMessage(ev);
    if (!msg) {
      return console.error("Failed to parse message", ev);
    }

    const cb = this.payloadHandlers.get(msg.type ?? "");
    if (!cb) {
      return console.warn("No handler exists for the received message", ev);
    }

    cb(msg.props ?? null);

    console.log(msg);
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

function parseMessage(ev) {
  try {
    return JSON.parse(ev.data);
  } catch (_e) {
    return false;
  }
}

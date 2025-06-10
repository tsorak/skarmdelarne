const state = {
  data: {
    totalRequests: 0,
    clients: new Map<string, Client>(),
  },

  totalRequests: function (): number {
    return this.data.totalRequests;
  },
  clients: function () {
    return {
      makeFrom: (
        id: string,
        name: string,
        send: (m: Message) => Promise<void>,
      ) => {
        const client: Client = {
          id,
          name,
          streaming: false,
          send,
        };

        this.data.clients.set(id, client);
        console.log(this.data.clients);

        return client;
      },
      remove: (id: string) => {
        this.data.clients.delete(id);
        console.log(this.data.clients);
      },
      toPublic: () => {
        const iter = this.data.clients.values().map((
          { id, name, streaming },
        ) => ({ id, name, streaming }));

        return Array.from(iter);
      },
      isStreaming: (
        id: string,
        isStreaming: boolean,
      ): [false, null] | [true, PublicClient] => {
        const v = this.data.clients.get(id);
        if (!v) return [false, null];

        v.streaming = isStreaming;

        this.data.clients.set(id, v);

        const publicClient: PublicClient = {
          id: v.id,
          name: v.name,
          streaming: v.streaming,
        };

        return [true, publicClient];
      },
      broadcast: {
        clientUpdate: (entry: PublicClient) => {
          this.data.clients.forEach((client) => {
            client.send({ type: "clientUpdate", client: entry });
          });
        },
        roomUpdate: () => {
          const publicClients = this.clients().toPublic();

          this.data.clients.forEach((client) => {
            client.send({
              type: "roomData",
              yourId: client.id,
              clients: publicClients,
            });
          });
        },
      },
    };
  },
};

interface Client {
  id: string;
  name: string;
  streaming: boolean;
  send: (m: Message) => Promise<void>;
}

type PublicClient = Pick<Client, "id" | "name" | "streaming">;

export default state;
export type Message =
  | RoomData
  | AskToWatch
  | Offer
  | Answer
  | ClientUpdate;

// 1 An AskToWatch gets sent BY a viewer.
// 2 An Offer is then made and sent FROM a screensharing client.
// 3 An Answer is finally made BY the original AskToWatcher.

interface RoomData {
  type: "roomData";
  yourId: string;
  clients: PublicClient[];
}

interface AskToWatch {
  type: "askToWatch";
  by: string;
}

interface Offer {
  type: "offer";
  from: string;
  offer: { sdp: string; type: string };
}

interface Answer {
  type: "answer";
  by: string;
  offer: { sdp: string; type: string };
}

interface ClientUpdate {
  type: "clientUpdate";
  client: PublicClient;
}

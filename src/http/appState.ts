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
        clientUpdate: (msg: ClientUpdate) => {
          this.data.clients.forEach((client) => {
            client.send(msg);
          });
        },
        modifyClient: (entry: PublicClient) => {
          this.data.clients.forEach((client) => {
            client.send({
              type: "clientUpdate",
              operation: "modify",
              client: entry,
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
  | Candidate
  | ClientUpdate;

// 1 An AskToWatch gets sent by a viewer.
// 2 An Offer is then made and sent from a streamer.
// 3 An Answer is made by the original AskToWatcher.
// 4 Candidates are sent between a streamer and a viewer.

interface RoomData {
  type: "roomData";
  yourId: string;
  clients: PublicClient[];
}

interface AskToWatch {
  type: "askToWatch";
  viewerId: string;
}

interface Offer {
  type: "offer";
  streamerId: string;
  offer: { sdp: string; type: string };
}

interface Answer {
  type: "answer";
  viewerId: string;
  answer: { sdp: string; type: string };
}

interface Candidate {
  type: "candidate";
  as: string;
  candidate: object;
}

interface ClientUpdate {
  type: "clientUpdate";
  operation: "add" | "modify" | "delete";
  client: PublicClient;
}

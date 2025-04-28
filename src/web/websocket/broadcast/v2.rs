use std::{collections::HashMap, net::SocketAddr, sync::Arc};

use tokio::sync::{RwLock, mpsc};

use super::super::transmit::Message;

#[derive(Clone, Debug, Default)]
pub struct Broadcast {
    rooms: Arc<RwLock<HashMap<String, Room>>>,
}

impl Broadcast {
    pub async fn broadcast(&self, room_name: &str, m: Message, exclude: &SocketAddr) {
        let rooms = self.rooms.read().await;
        if let Some(room) = rooms.get(room_name) {
            let _ = room.broadcast(&m, exclude);
        }
    }

    pub async fn join_room(
        &self,
        room_name: &str,
        identity: &SocketAddr,
    ) -> mpsc::Receiver<Message> {
        let read_lock = self.rooms.read().await;
        let room = read_lock.get(room_name);

        match room {
            Some(room) => room.subscribe(identity).await,
            None => {
                drop(read_lock);
                let mut write_lock = self.rooms.write().await;

                let room = Room::new();
                let rx = room.subscribe(identity).await;

                write_lock.insert(room_name.to_string(), room);

                rx
            }
        }
    }
}

struct Room {
    pub(self) sockets: Arc<RwLock<HashMap<SocketAddr, mpsc::Sender<Message>>>>,
    // pub(self) tx: Sender<Message>,
}

impl Room {
    pub fn new() -> Self {
        // let (tx, _) = broadcast::channel(64);
        Self {
            sockets: Default::default(),
        }
    }

    pub async fn broadcast(&self, m: &Message, exclude: &SocketAddr) {
        for (addr, tx) in self.sockets.read().await.iter() {
            if addr != exclude {
                let _ = tx.send(m.clone()).await;
            }
        }
    }

    pub async fn subscribe(&self, id: &SocketAddr) -> mpsc::Receiver<Message> {
        let (tx, rx) = mpsc::channel(64);

        let mut write_lock = self.sockets.write().await;

        write_lock.insert(id.to_owned(), tx);

        rx
    }
}

impl std::fmt::Display for Room {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Room")
    }
}

impl std::fmt::Debug for Room {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Room")
    }
}

mod room {
    use super::*;

    // use tokio::sync::mpsc;

    struct RoomTx(pub(super) SocketAddr, pub(super) mpsc::Sender<Message>);
    struct RoomRx(pub(super) mpsc::Receiver<Message>);

    impl RoomTx {
        pub async fn send(&self, m: Message) -> Result<(), mpsc::error::SendError<Message>> {
            self.1.send(m).await
        }
    }
}

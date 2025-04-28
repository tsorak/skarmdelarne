use std::{collections::HashMap, net::SocketAddr, sync::Arc};

use futures::SinkExt;
use tokio::sync::{RwLock, broadcast as bc};

pub use split::{Receiver, Sender};

#[derive(Debug, Clone)]
pub struct Broadcast<T: Clone> {
    rooms: Arc<RwLock<HashMap<String, Room<T>>>>,
}

#[derive(Debug)]
pub struct Room<T: Clone> {
    clients: Vec<SocketAddr>,
    tx: bc::Sender<Message<T>>,
}

pub struct BroadcastRemote<T: Clone> {
    receiver: bc::Receiver<Message<T>>,
    broadcast: Broadcast<T>,
    my_id: SocketAddr,
    current_room: String,
}

#[derive(Clone)]
pub struct Message<T: Clone> {
    pub(self) broadcaster_id: Option<SocketAddr>,
    pub(self) payload: T,
}

impl<T: Clone> Default for Broadcast<T> {
    fn default() -> Self {
        Self {
            rooms: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

impl<T: Clone> Broadcast<T> {
    pub async fn join(&self, room_name: impl AsRef<str>, id: SocketAddr) -> BroadcastRemote<T> {
        let mut w_lock = self.rooms.write().await;

        let room_name = room_name.as_ref();

        match w_lock.get_mut(room_name) {
            Some(room) => {
                let rx = room.tx.subscribe();
                room.clients.push(id);
                BroadcastRemote::new(self.clone(), rx, id, room_name.to_string())
            }
            None => {
                let (tx, rx) = bc::channel(64);

                let mut room = Room::new(tx);
                room.clients.push(id);

                let remote = BroadcastRemote::new(self.clone(), rx, id, room_name.to_string());

                w_lock.insert(room_name.to_string(), room);

                remote
            }
        }
    }

    pub async fn leave(&self, room_name: impl AsRef<str>, id: SocketAddr) {
        let r_lock = self.rooms.read().await;

        let room_name = room_name.as_ref();

        if let Some(room) = r_lock.get(room_name) {
            let del_id = room
                .clients
                .iter()
                .enumerate()
                .find_map(|(i, entry_id)| if entry_id == &id { Some(i) } else { None });

            if let Some(i) = del_id {
                drop(r_lock);

                let mut w_lock = self.rooms.write().await;
                let room = w_lock.get_mut(room_name).unwrap();

                room.clients.remove(i);
            }
        }
    }
}

impl Broadcast<crate::web::OutgoingMessage> {
    pub async fn broadcast_clients_list_update(
        &self,
        room_name: &str,
        exclude: Option<SocketAddr>,
    ) {
        use super::super::transmit;
        use crate::web::payload;

        let w_lock = self.rooms.write().await;
        if let Some(room) = w_lock.get(room_name) {
            let payload = payload::ClientListUpdate {
                props: payload::prop::ClientListUpdate {
                    clients: room.clients.clone(),
                },
            };

            let message = Message {
                broadcaster_id: exclude,
                payload: transmit::Message::ClientListUpdate(payload),
            };

            let _ = room.tx.send(message);
        }
    }
}

#[allow(unused)]
impl<T: Clone> BroadcastRemote<T> {
    pub(self) fn new(
        broadcast: Broadcast<T>,
        receiver: bc::Receiver<Message<T>>,
        my_id: SocketAddr,
        current_room: String,
    ) -> Self {
        Self {
            receiver,
            broadcast,
            my_id,
            current_room,
        }
    }

    pub async fn broadcast(&self, message: T) -> Result<usize, bc::error::SendError<Message<T>>> {
        let r_lock = self.broadcast.rooms.read().await;

        let room = r_lock
            .get(&self.current_room)
            .expect("The room we've been given should exist");

        let message = Message {
            broadcaster_id: Some(self.my_id),
            payload: message,
        };

        room.tx.send(message)
    }

    pub async fn recv(&mut self) -> Option<T> {
        loop {
            let message = self.receiver.recv().await;

            match message {
                Ok(m) => {
                    if m.broadcaster_id.is_some_and(|id| id == self.my_id) {
                        continue;
                    };

                    return Some(m.payload);
                }
                Err(bc::error::RecvError::Closed) => {
                    return None;
                }
                Err(e) => {
                    dbg!("v2::broadcast receive error", e);

                    continue;
                }
            }
        }
    }
}

impl<T: Clone> Room<T> {
    fn new(tx: bc::Sender<Message<T>>) -> Self {
        Self {
            tx,
            clients: vec![],
        }
    }
}

pub mod split {
    use super::*;

    impl<T: Clone> BroadcastRemote<T> {
        pub fn split(self) -> (Sender<T>, Receiver<T>) {
            let Self {
                receiver,
                broadcast,
                my_id,
                current_room,
            } = self;

            let tx = Sender {
                broadcast: broadcast.clone(),
                current_room: current_room.clone(),
                my_id,
            };

            let rx = Receiver {
                receiver,
                my_id,
                // broadcast,
                // current_room,
            };

            (tx, rx)
        }
    }

    pub struct Sender<T: Clone> {
        pub(self) broadcast: Broadcast<T>,
        pub(self) current_room: String,
        pub(self) my_id: SocketAddr,
    }

    pub struct Receiver<T: Clone> {
        pub(self) receiver: bc::Receiver<Message<T>>,
        pub(self) my_id: SocketAddr,
        // for cleanup (leaving room on Drop)
        // pub(self) broadcast: Broadcast<T>,
        // pub(self) current_room: String,
    }

    impl<T: Clone> Sender<T> {
        pub async fn broadcast(
            &self,
            message: T,
        ) -> Result<usize, bc::error::SendError<Message<T>>> {
            let r_lock = self.broadcast.rooms.read().await;

            let room = r_lock
                .get(&self.current_room)
                .expect("The room we've been given should exist");

            let message = Message {
                broadcaster_id: Some(self.my_id),
                payload: message,
            };

            room.tx.send(message)
        }
    }

    impl<T: Clone> Receiver<T> {
        pub async fn recv(&mut self) -> Option<T> {
            loop {
                let message = self.receiver.recv().await;

                match message {
                    Ok(m) => {
                        if m.broadcaster_id.is_some_and(|id| id == self.my_id) {
                            continue;
                        };

                        return Some(m.payload);
                    }
                    Err(bc::error::RecvError::Closed) => {
                        return None;
                    }
                    Err(e) => {
                        dbg!("v2::broadcast receive error", e);

                        continue;
                    }
                }
            }
        }
    }
}

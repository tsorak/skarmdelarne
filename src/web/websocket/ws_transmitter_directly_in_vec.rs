use axum::extract::ws::{self, WebSocket};
use futures::{SinkExt, stream::SplitSink};
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct Clients {
    vec: Arc<Mutex<Vec<Client>>>,
}

impl Default for Clients {
    fn default() -> Self {
        Self {
            vec: Arc::new(Mutex::new(vec![])),
        }
    }
}

#[derive(Debug)]
pub struct Client {
    pub(self) addr: SocketAddr,
    pub(self) tx: SplitSink<WebSocket, ws::Message>,
}

impl Clients {
    pub async fn push(&self, addr: SocketAddr, tx: SplitSink<WebSocket, ws::Message>) {
        self.vec.lock().await.push(Client::new(addr, tx));
    }

    pub async fn broadcast<M: serde::Serialize>(
        &self,
        message: M,
        exclude: Option<SocketAddr>,
    ) -> anyhow::Result<()> {
        let message = serde_json::to_string(&message)?;

        if let Some(addr) = exclude {
            for client in self.vec.lock().await.iter_mut() {
                if client.addr == addr {
                    continue;
                };

                let _ = client.tx.send(ws::Message::text(&message)).await;
            }
        } else {
            for client in self.vec.lock().await.iter_mut() {
                let _ = client.tx.send(ws::Message::text(&message)).await;
            }
        }

        Ok(())
    }

    pub async fn remove(&self, addr: SocketAddr) {
        let mut lock = self.vec.lock().await;

        let found_index =
            lock.iter().enumerate().find_map(
                |(i, client)| {
                    if client.addr == addr { Some(i) } else { None }
                },
            );

        if let Some(index) = found_index {
            lock.remove(index);
        }
    }
}

impl Client {
    pub fn new(addr: SocketAddr, tx: SplitSink<WebSocket, ws::Message>) -> Self {
        Self { addr, tx }
    }
}

/// Lives for the duration a socket is open
struct SocketClient<'a> {
    clients: &'a Clients,
    addr: SocketAddr,
}

impl<'a> SocketClient<'a> {
    pub fn new(current_addr: SocketAddr, tx: SplitSink<WebSocket, ws::Message>, clients: &'a Clients) -> Self {
        let client = Client::new(addr, tx);
        clients.push(addr, tx)

        Self {
            clients,
            addr: current_addr,
        }
    }

    pub async fn broadcast(&self, message: transmit::Message) {
        if let Err(e) = self.clients.broadcast(message, Some(self.addr)).await {
            tracing::error!("Failed to broadcast message: {e}")
        }
    }

    /// Broadcast to everyone including the current socket
    pub async fn broadcast_all(&self, message: transmit::Message) {
        if let Err(e) = self.clients.broadcast(message, None).await {
            tracing::error!("Failed to broadcast message: {e}")
        }
    }

    pub async fn cleanup(&self) {
        // Remove from the list of connected clients
        self.clients.remove(self.addr).await;
    }
}

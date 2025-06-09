use std::net::SocketAddr;

use std::ops::ControlFlow;

use axum::{
    extract::{
        ConnectInfo, State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};

use crate::web::{AppState, OutgoingMessage, payload, websocket::broadcast as bc};

pub async fn handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, addr, state))
}

async fn handle_socket(socket: WebSocket, who: SocketAddr, state: AppState) {
    let (mut sender, mut receiver) = socket.split();

    let identity_info =
        serde_json::to_string(&OutgoingMessage::UpdateIdentity(payload::UpdateIdentity {
            props: payload::prop::UpdateIdentity { your_id: who },
        }))
        .unwrap();
    let _ = sender.send(Message::Text(identity_info.into())).await;

    let (room_tx, mut room_rx) = state.sockets.join("default", who).await.split();

    state
        .sockets
        .broadcast_clients_list_update("default", None)
        .await;

    let send_task = tokio::spawn(async move {
        let mut cnt = 0_u64;
        while let Some(m) = room_rx.recv().await {
            cnt += 1;
            if let Ok(s) = serde_json::to_string(&m) {
                let _ = sender.send(Message::text(s)).await;
            }
        }
        cnt
    });

    let recv_task = tokio::spawn(async move {
        let room_tx = room_tx;
        let mut cnt = 0_u64;
        while let Some(Ok(msg)) = receiver.next().await {
            cnt += 1;
            if process_message(msg, who, &room_tx).await.is_break() {
                break;
            }
        }
        cnt
    });

    let send_abort = send_task.abort_handle();
    let recv_abort = recv_task.abort_handle();

    tokio::select! {
        s = send_task => {
            match s {
                Ok(b) => tracing::info!("Sent a total of {b} messages from {who}"),
                Err(b) => println!("Error sending messages {b:?}"),
            }
            recv_abort.abort();
        }
        r = recv_task => {
            match r {
                Ok(b) => tracing::info!("Received a total of {b} messages from {who}"),
                Err(b) => println!("Error receiving messages {b:?}"),
            }
            send_abort.abort();
        }
    }

    state.sockets.leave("default", who).await;

    // returning closes the websocket connection
    tracing::info!("Websocket context {who} destroyed");
}

/// helper to print contents of messages to stdout. Has special treatment for Close.
async fn process_message(
    msg: Message,
    who: SocketAddr,
    room_tx: &bc::Sender<OutgoingMessage>,
) -> ControlFlow<(), ()> {
    match msg {
        Message::Text(t) => {
            println!(">>> {who} sent str: {}", t);
            super::router::handle(t.as_str(), who, room_tx).await;
        }
        Message::Binary(d) => {
            println!(">>> {} sent {} bytes: {:?}", who, d.len(), d);
        }
        Message::Close(c) => {
            if let Some(cf) = c {
                println!(
                    ">>> {} sent close with code {} and reason `{}`",
                    who, cf.code, cf.reason
                );
            } else {
                println!(">>> {who} somehow sent close message without CloseFrame");
            }
            return ControlFlow::Break(());
        }

        Message::Pong(v) => {
            println!(">>> {who} sent pong with {v:?}");
        }
        // You should never need to manually handle Message::Ping, as axum's websocket library
        // will do so for you automagically by replying with Pong and copying the v according to
        // spec. But if you need the contents of the pings you can see them here.
        Message::Ping(v) => {
            println!(">>> {who} sent ping with {v:?}");
        }
    }
    ControlFlow::Continue(())
}

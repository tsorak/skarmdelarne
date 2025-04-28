use std::{net::SocketAddr, path::PathBuf};

use axum::routing::{Router, any};
use tower_http::{
    services::ServeDir,
    trace::{DefaultMakeSpan, TraceLayer},
};

mod payload;
mod websocket;

use websocket::OutgoingMessage;

#[derive(Debug, Clone, Default)]
struct AppState {
    sockets: websocket::broadcast::Broadcast<OutgoingMessage>,
}

pub async fn serve() {
    #[cfg(debug_assertions)]
    http().await;

    #[cfg(not(debug_assertions))]
    https().await;
}

async fn http() {
    println!("Hello Dev");

    let assets_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("svelte")
        .join("dist");

    // build our application with some routes
    let app = Router::new()
        .fallback_service(ServeDir::new(assets_dir).append_index_html_on_directories(true))
        .route("/ws", any(websocket::handler))
        .with_state(AppState::default())
        .layer(TraceLayer::new_for_http().make_span_with(DefaultMakeSpan::default()));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    tracing::debug!("listening on {}", listener.local_addr().unwrap());
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}

async fn https() {
    println!("Hello Prod");
}

// impl Default for AppState {
//     fn default() -> Self {
//         Self {
//             ..Default::default()
//         }
//     }
// }

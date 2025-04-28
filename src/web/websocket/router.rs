use serde::Deserialize;

use crate::web::{payload, websocket::broadcast as bc};

use super::OutgoingMessage;

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum IncomingMessage {
    Offer(payload::Offer),
}

// #[derive(Serialize, Deserialize, Debug, Clone)]
// pub struct Offer {
//     pub props: prop::Offer,
// }

pub async fn handle(text: &str, tx: &bc::Sender<OutgoingMessage>) {
    let message = if let Ok(m) = parse(text) { m } else { return };

    dbg!(&message);

    match message {
        IncomingMessage::Offer(data) => {
            let _ = tx.broadcast(OutgoingMessage::Offer(data)).await;
        }
    }
}

fn parse(text: &str) -> Result<IncomingMessage, serde_json::Error> {
    serde_json::from_str(text).inspect_err(|e| {
        dbg!(e);
    })
}

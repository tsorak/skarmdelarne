use std::net::SocketAddr;

use serde::Deserialize;

use crate::web::{payload, websocket::broadcast as bc};

use super::OutgoingMessage;

#[derive(Deserialize, Debug, Clone)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum IncomingMessage {
    // Offer(payload::Offer),
    Offers(payload::Offers),
}

// #[derive(Serialize, Deserialize, Debug, Clone)]
// pub struct Offer {
//     pub props: prop::Offer,
// }

pub async fn handle(text: &str, who: SocketAddr, room_tx: &bc::Sender<OutgoingMessage>) {
    let message = if let Ok(m) = parse(text) { m } else { return };

    dbg!(&message);

    match message {
        // IncomingMessage::Offer(data) => {
        //     let _ = room_tx.broadcast(OutgoingMessage::Offer(data)).await;
        // }
        IncomingMessage::Offers(payload::Offers { props: data }) => {
            for offer_target in data.offers.into_iter() {
                let offer = payload::Offer {
                    props: offer_target.offer.with_initiator(who),
                };

                let _ = room_tx
                    .send_to(offer_target.id, OutgoingMessage::Offer(offer))
                    .await
                    .inspect_err(|e| {
                        dbg!(e);
                    });
            }
        }
    }
}

fn parse(text: &str) -> Result<IncomingMessage, serde_json::Error> {
    serde_json::from_str(text).inspect_err(|e| {
        dbg!(e);
    })
}

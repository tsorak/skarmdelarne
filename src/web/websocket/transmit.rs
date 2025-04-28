use serde::Serialize;

use crate::web::payload::{ClientListUpdate, Offer};

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Message {
    Offer(Offer),
    ClientListUpdate(ClientListUpdate),
}

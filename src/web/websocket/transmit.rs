use serde::Serialize;

use crate::web::payload;

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Message {
    Offer(payload::Offer),
    UpdateClientList(payload::UpdateClientList),
    UpdateIdentity(payload::UpdateIdentity),
}

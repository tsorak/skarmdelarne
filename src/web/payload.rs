use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Offer {
    pub props: prop::Offer,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ClientListUpdate {
    pub props: prop::ClientListUpdate,
}

pub mod prop {
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Offer {
        #[serde(rename = "type")]
        _kind: String,
        pub sdp: String,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct ClientListUpdate {
        pub clients: Vec<std::net::SocketAddr>,
    }
}

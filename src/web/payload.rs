use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Offer {
    pub props: prop::Offer,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateClientList {
    pub props: prop::UpdateClientList,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Offers {
    pub props: prop::Offers,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateIdentity {
    pub props: prop::UpdateIdentity,
}

pub mod prop {
    use serde::{Deserialize, Serialize};
    use std::net::SocketAddr;

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct Offer {
        #[serde(rename = "type")]
        pub _kind: String,
        pub sdp: String,
        pub initiator_id: SocketAddr,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct UpdateClientList {
        pub clients: Vec<SocketAddr>,
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Offers {
        pub offers: Vec<offers::OfferTarget>,
    }

    mod offers {
        use super::super::webapi;
        use serde::{Deserialize, Serialize};
        use std::net::SocketAddr;

        #[derive(Serialize, Deserialize, Debug, Clone)]
        pub struct OfferTarget {
            pub id: SocketAddr,
            pub offer: webapi::Offer,
        }
    }

    #[derive(Serialize, Deserialize, Debug, Clone)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateIdentity {
        pub your_id: SocketAddr,
    }
}

pub mod webapi {
    use serde::{Deserialize, Serialize};
    use std::net::SocketAddr;

    use super::prop;

    /// Returned by [RTCPeerConnection.createOffer](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)
    #[derive(Serialize, Deserialize, Debug, Clone)]
    pub struct Offer {
        #[serde(rename = "type")]
        pub _kind: String,
        pub sdp: String,
    }

    impl Offer {
        pub fn with_initiator(self, initiator_id: SocketAddr) -> prop::Offer {
            prop::Offer {
                _kind: self._kind,
                sdp: self.sdp,
                initiator_id,
            }
        }
    }
}

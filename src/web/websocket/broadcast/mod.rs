#[allow(unused)]
pub use self::v1::{Broadcast, Message, Receiver, Sender};

/// Uses tokio::sync::broadcast channel.
/// Each room participant filter out messages they have received that aren't meant for them.
mod v1;

/// Uses tokio::sync::mpsc channels.
/// Each room participant gets their own channel, so filtering is to be handled by the sender
/// instead.
#[allow(unused)]
mod v2;

export function setupRTC() {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.addEventListener(
    "track",
    (e) => {
      const v = document.querySelector("remote-stream");

      v.srcObject = e.streams[0];
    },
    false,
  );

  addEventListener("icecandidate", (event) => {
    console.log(event);
    if (event.candidate !== null) {
      sendCandidateToRemotePeer(event.candidate);
    } else {
      /* there are no more candidates coming during this negotiation */
    }
  });

  return pc;
}

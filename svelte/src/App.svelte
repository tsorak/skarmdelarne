<script>
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from '/vite.svg'
  import Counter from './lib/Counter.svelte'
  import { setupRTC } from './lib/rtc.js'
  import { Socket } from './lib/Socket.js'

  const peerConnection = setupRTC();
  console.dir(peerConnection);

  const socket = new Socket("/ws");

  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);

    console.log(offer);
    socket.offer(offer);
  });


  async function startSharing() {
    const v = document.querySelector("#local-screen");
    if (!v) return;

    const dev = navigator.mediaDevices;

    if (!dev) {
      console.error("No access to media devices.")
      return;
    }

    const screenCapture = await dev.getDisplayMedia({video:true,audio:true});

    v.srcObject = screenCapture;
  }
</script>

<main>
  <div>
    <a href="https://vite.dev" target="_blank" rel="noreferrer">
      <img src={viteLogo} class="logo" alt="Vite Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank" rel="noreferrer">
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>
  <h1>Vite + Svelte</h1>

  <div class="card">
    <Counter />
  </div>

  <p>
    Check out <a href="https://github.com/sveltejs/kit#readme" target="_blank" rel="noreferrer">SvelteKit</a>, the official Svelte app framework powered by Vite!
  </p>

  <p class="read-the-docs">
    Click on the Vite and Svelte logos to learn more
  </p>

  <button type="button" onclick={() => startSharing()}>Start Screenshare</button>
  <div class="xdd">
    <div class="vcontainer">
      <p>my stream</p>
      <video id="local-screen" controls autoplay />
    </div>
    <div class="vcontainer">
      <p>remote stream</p>
      <video id="remote-screen" controls autoplay />
    </div>
  </div>
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }

  .vcontainer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  video {
    width: 33vw;
  }

  .xdd {
    display: flex;
    gap: 3rem;
  }
</style>

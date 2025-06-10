import { Route, Router } from "@solidjs/router";

import api from "./api.js";

import { ScreenshareProvider } from "./context/screenshare.jsx";

import Room from "./route/Room.jsx";

function App() {
  console.log(api.base);

  return (
    <Router root={Layout}>
      <Route path="*" component={Room} />
    </Router>
  );
}

function Layout(props) {
  return (
    <ScreenshareProvider>
      {props.children}
    </ScreenshareProvider>
  );
}

export default App;

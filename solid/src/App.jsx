import { Route, Router } from "@solidjs/router";

import { ScreenshareProvider } from "./context/screenshare.jsx";
import { SessionProvider } from "./context/session.jsx";
import { LoaderProvider } from "./context/loader.jsx";

import Room from "./route/Room.jsx";
import Auth from "./route/Auth.jsx";

function App() {
  return (
    <Router root={Layout}>
      <Route path="/auth" component={Auth} />
      <Route path="*" component={Room} />
    </Router>
  );
}

function Layout(props) {
  return (
    <LoaderProvider>
      <SessionProvider>
        <ScreenshareProvider>
          {props.children}
        </ScreenshareProvider>
      </SessionProvider>
    </LoaderProvider>
  );
}

export default App;

import "./styles/index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { TournamentProvider } from "./state/store";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TournamentProvider>
      <App />
    </TournamentProvider>
  </React.StrictMode>,
);

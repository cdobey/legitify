import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./config/firebase";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import { theme } from "./theme";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <AuthProvider>
          <App />
        </AuthProvider>
      </MantineProvider>
    </BrowserRouter>
  </React.StrictMode>
);

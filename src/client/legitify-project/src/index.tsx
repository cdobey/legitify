import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { queryClient } from "./config/queryClient";
import "./config/supabase";
import { AuthProvider } from "./contexts/AuthContext";
import "./styles/index.css";
import { theme } from "./styles/theme";
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// Remove the initial loader
const initialLoader = document.getElementById("initial-loader");
if (initialLoader) {
  initialLoader.remove();
}

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);

import "@fontsource/inter/300.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./RouterApp";
import { purgeLegacyAuthStorage } from "./store/auth-store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

purgeLegacyAuthStorage();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(10, 22, 40, 0.92)",
            color: "#E2ECFF",
            border: "1px solid rgba(255,255,255,0.12)",
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
);

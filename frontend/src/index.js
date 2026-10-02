import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "@/styles/dark-utilities.css";
import App from "@/app/App";
import { ensureSeedsIfNeeded } from "@/data/seedRegistry";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Muat seed demo hanya saat dibutuhkan (pengunjung pertama / setelah Reset Demo Data)
ensureSeedsIfNeeded().finally(() => {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

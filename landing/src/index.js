import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import "@/index.css";
import Home from "@/pages/Home";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Home />
    <Toaster position="top-right" richColors />
  </React.StrictMode>,
);

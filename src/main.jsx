import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";

// Force light mode - prevent dark mode from being applied
document.documentElement.classList.remove("dark");

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

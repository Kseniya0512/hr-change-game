import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
const App = lazy(() => import.meta.env.MODE === "pages"
  ? import("./StandaloneApp.tsx")
  : import("./App.tsx"));
import "./styles.css";
import "./survey-theme.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<p className="notice">Загружаем игру…</p>}><App /></Suspense>
  </React.StrictMode>,
);

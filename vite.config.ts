import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");

          if (!normalizedId.includes("node_modules")) {
            return undefined;
          }

          if (
            normalizedId.includes("@firebase/firestore") ||
            normalizedId.includes("firebase/firestore")
          ) {
            return "firebase-firestore";
          }

          if (
            normalizedId.includes("@firebase/auth") ||
            normalizedId.includes("firebase/auth")
          ) {
            return "firebase-auth";
          }

          if (
            normalizedId.includes("@firebase/") ||
            normalizedId.includes("firebase/")
          ) {
            return "firebase-core";
          }

          if (normalizedId.includes("react-router")) {
            return "vendor-router";
          }

          if (normalizedId.includes("react")) {
            return "vendor-react";
          }

          if (normalizedId.includes("motion")) {
            return "vendor-motion";
          }

          return "vendor";
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

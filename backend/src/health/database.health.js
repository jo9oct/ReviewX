import mongoose from "mongoose";

export const checkDatabaseHealth =
  async () => {
    const state =
      mongoose.connection.readyState;

    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    return {
      name: "database",
      status:
        state === 1
          ? "healthy"
          : "unhealthy",
      state:
        states[state] ||
        "unknown",
      connected:
        state === 1,
    };
  };
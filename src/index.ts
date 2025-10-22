import express from "express";
import { getLatestStats } from "./db/queries";
import { getSPDepositEvents, getSPDepositEventsByBranch } from "./event-handling/db";
import { PORT } from "./utils/env";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Mustang Stats API");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Main stats endpoint matching Liquity format
app.get("/v2/saga.json", async (req, res) => {
  try {
    const stats = await getLatestStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Endpoint to get stats with timestamps for debugging
app.get("/v2/saga/history", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const stats = await getLatestStats(limit);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats history:", error);
    res.status(500).json({ error: "Failed to fetch stats history" });
  }
});

// Endpoint to get SP deposit events
app.get("/events/sp-deposits", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const depositor = req.query.depositor as string | undefined;
    const fromTimestamp = req.query.fromTimestamp ? BigInt(req.query.fromTimestamp as string) : undefined;
    const toTimestamp = req.query.toTimestamp ? BigInt(req.query.toTimestamp as string) : undefined;

    const events = await getSPDepositEvents({
      limit,
      offset,
      depositor,
      fromTimestamp,
      toTimestamp,
    });

    res.json({
      count: events.length,
      limit,
      offset,
      events: events.map(e => ({
        ...e,
        blockNumber: e.blockNumber.toString(),
        blockTimestamp: e.blockTimestamp.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching SP deposit events:", error);
    res.status(500).json({ error: "Failed to fetch SP deposit events" });
  }
});

// Endpoint to get SP deposit events by branch
app.get("/events/sp-deposits/branch/:branchId", async (req, res) => {
  try {
    if (!req.params.branchId) {
      res.status(400).json({ error: "Branch ID is required" });
      return;
    }
    const branchId = parseInt(req.params.branchId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const events = await getSPDepositEventsByBranch(branchId, limit);

    res.json({
      branchId,
      count: events.length,
      limit,
      events: events.map(e => ({
        ...e,
        blockNumber: e.blockNumber.toString(),
        blockTimestamp: e.blockTimestamp.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching SP deposit events by branch:", error);
    res.status(500).json({ error: "Failed to fetch SP deposit events" });
  }
});

app.listen(PORT, () => {
  console.log("Mustang Stats API");
  console.log(`Server listening on http://localhost:${PORT}...`);
});

export default app;
import { Elysia } from "elysia";
import { getLatestStats } from "./db/queries";
import { getSPDepositEvents, getSPDepositEventsByBranch } from "./event-handling/db";

const app = new Elysia();

// Health check endpoint
app.get("/health", () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

// Main stats endpoint matching Liquity format
app.get("/v2/saga.json", async () => {
  try {
    const stats = await getLatestStats();
    return stats;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch stats" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Endpoint to get stats with timestamps for debugging
app.get("/v2/saga/history", async (context) => {
  try {
    const limit = context.query?.limit ? parseInt(context.query.limit as string) : 10;
    const stats = await getLatestStats(limit);
    return stats;
  } catch (error) {
    console.error("Error fetching stats history:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch stats history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Endpoint to get SP deposit events
app.get("/events/sp-deposits", async (context) => {
  try {
    const limit = context.query?.limit ? parseInt(context.query.limit as string) : 100;
    const offset = context.query?.offset ? parseInt(context.query.offset as string) : 0;
    const depositor = context.query?.depositor as string | undefined;
    const fromTimestamp = context.query?.fromTimestamp ? BigInt(context.query.fromTimestamp as string) : undefined;
    const toTimestamp = context.query?.toTimestamp ? BigInt(context.query.toTimestamp as string) : undefined;

    const events = await getSPDepositEvents({
      limit,
      offset,
      depositor,
      fromTimestamp,
      toTimestamp,
    });

    return {
      count: events.length,
      limit,
      offset,
      events: events.map(e => ({
        ...e,
        blockNumber: e.blockNumber.toString(),
        blockTimestamp: e.blockTimestamp.toString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching SP deposit events:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch SP deposit events" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Endpoint to get SP deposit events by branch
app.get("/events/sp-deposits/branch/:branchId", async (context) => {
  try {
    const branchId = parseInt(context.params.branchId);
    const limit = context.query?.limit ? parseInt(context.query.limit as string) : 100;

    const events = await getSPDepositEventsByBranch(branchId, limit);

    return {
      branchId,
      count: events.length,
      limit,
      events: events.map(e => ({
        ...e,
        blockNumber: e.blockNumber.toString(),
        blockTimestamp: e.blockTimestamp.toString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching SP deposit events by branch:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch SP deposit events" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Mustang Stats API");
  console.log(`Server listening on http://localhost:${port}...`);
});

export default app;
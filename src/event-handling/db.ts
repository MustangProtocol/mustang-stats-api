import { getDb } from '@/src/db/connection';
import { eventQueryState, spDepositEvents } from '@/src/db/schema';
import { eq, desc, gte, lte, and, SQL } from 'drizzle-orm';
import type { SPDepositUpdatedLogs } from './types';

export async function getSPDepositEvents(params?: {
  fromTimestamp?: bigint;
  toTimestamp?: bigint;
  depositor?: string;
  limit?: number;
  offset?: number;
}) {
  const db = getDb();
  const { fromTimestamp, toTimestamp, depositor, limit = 100, offset = 0 } = params ?? {};

  try {
    const conditions: SQL[] = [];

    if (fromTimestamp) {
      conditions.push(gte(spDepositEvents.blockTimestamp, fromTimestamp));
    }

    if (toTimestamp) {
      conditions.push(lte(spDepositEvents.blockTimestamp, toTimestamp));
    }

    if (depositor) {
      conditions.push(eq(spDepositEvents.depositor, depositor));
    }

    if (conditions.length > 0) {
      return await db.select()
        .from(spDepositEvents)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(spDepositEvents.blockTimestamp))
        .limit(limit)
        .offset(offset);
    } else {
      return await db.select()
        .from(spDepositEvents)
        .orderBy(desc(spDepositEvents.blockTimestamp))
        .limit(limit)
        .offset(offset);
    }
  } catch (error) {
    console.error('Error fetching SP deposit events:', error);
    throw error;
  }
}

export async function getSPDepositEventsByBranch(branchId: number, limit: number = 100) {
  const db = getDb();

  try {
    const results = await db
      .select()
      .from(spDepositEvents)
      .where(eq(spDepositEvents.branchId, branchId))
      .orderBy(desc(spDepositEvents.blockTimestamp))
      .limit(limit);

    return results;
  } catch (error) {
    console.error(`Error fetching SP deposit events for branch ${branchId}:`, error);
    throw error;
  }
}

export async function countSPDepositEvents() {
  const db = getDb();

  try {
    const result = await db.select().from(spDepositEvents).limit(1);
    return result.length > 0 ? result.length : 0;
  } catch (error) {
    console.error('Error counting SP deposit events:', error);
    throw error;
  }
}

export async function getEventQueryStateByType(eventType: string) {
  const db = getDb();

  try {
    const result = await db
      .select()
      .from(eventQueryState)
      .where(eq(eventQueryState.eventType, eventType))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Error fetching query state for ${eventType}:`, error);
    throw error;
  }
}

export async function updateEventQueryStateInDb(eventType: string, fromBlock: string, toBlock: string) {
  const db = getDb();

  try {
    const existing = await getEventQueryStateByType(eventType);

    if (existing) {
      await db
        .update(eventQueryState)
        .set({
          lastQueriedFromBlock: fromBlock,
          lastQueriedToBlock: toBlock,
          updatedAt: new Date(),
        })
        .where(eq(eventQueryState.eventType, eventType));
    } else {
      await db.insert(eventQueryState).values({
        eventType,
        lastQueriedFromBlock: fromBlock,
        lastQueriedToBlock: toBlock,
      });
    }

    console.log(`Updated event query state for ${eventType}: from ${fromBlock} to ${toBlock}`);
  } catch (error) {
    console.error(`Error updating query state for ${eventType}:`, error);
    throw error;
  }
}

export async function saveSPDepositEventsToDB(logs: SPDepositUpdatedLogs[]) {
  const db = getDb();

  try {
    for (const log of logs) {
      await db.insert(spDepositEvents).values({
        depositor: log.depositor,
        depositAmount: log.depositAmount,
        stashedColl: log.stashedColl,
        blockNumber: BigInt(log.blockNumber),
        blockTimestamp: BigInt(log.blockTimestamp),
        transactionHash: log.transactionHash,
        branchId: log.sp.branchId,
        spAddress: log.sp.address,
      });
    }

    console.log(`Successfully saved ${logs.length} SP deposit events to database`);
    return logs.length;
  } catch (error) {
    console.error('Error saving SP deposit events to database:', error);
    throw error;
  }
}

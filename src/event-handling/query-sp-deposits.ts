import { isAddressEqual, parseAbiItem } from 'viem';
import type { CollIndex } from '@/src/types';
import { getPublicClient } from '@/src/utils/client';
import { getContracts } from '@/src/lib/contracts';
import { ORIGIN_BLOCK } from '../utils/constants';
import { getDb } from '@/src/db/connection';
import { eventQueryState, spDepositEvents } from '@/src/db/schema';
import { and, eq, gte, lte, SQL } from 'drizzle-orm';
import type { SPDepositUpdatedLogs } from './types';

const EVENT_TYPE = 'SP_DEPOSIT_UPDATED';

export async function queryAndLogStabilityPoolDepositUpdatedEvents() {
  const lastQueriedData = await queryStabilityPoolDepositUpdatedEvents();
  
  if (lastQueriedData.logs.length > 0) {
    await saveEventsToDatabase(lastQueriedData.logs);
    await updateEventQueryState(lastQueriedData.lastQueriedFromBlock, lastQueriedData.lastQueriedToBlock);
  }

  return lastQueriedData;
}

export async function queryStabilityPoolDepositUpdatedEvents() {
  const client = getPublicClient();
  const contracts = getContracts();

  let queryState = await getEventQueryState();

  const fromBlock = queryState.lastQueriedToBlock ? BigInt(queryState.lastQueriedToBlock) : ORIGIN_BLOCK;
  const latestBlock = await client.getBlockNumber();
  
  const filter = await client.createEventFilter({
    address: contracts.collaterals.map(collateral => collateral.contracts.StabilityPool.address),
    event: parseAbiItem('event DepositUpdated(address indexed _depositor,uint256 _newDeposit,uint256 _stashedColl,uint256 _snapshotP,uint256 _snapshotS,uint256 _snapshotB,uint256 _snapshotScale)'),
    strict: true,
    fromBlock,
    toBlock: latestBlock
  });

  const events = await client.getFilterLogs({ filter });

  const recentLogs = await Promise.all(events.map(async event => {
    const block = event.blockNumber ? await client.getBlock({ blockNumber: event.blockNumber }) : null;
    return {
      depositor: event.args._depositor,
      depositAmount: event.args._newDeposit.toString(),
      stashedColl: event.args._stashedColl.toString(),
      blockNumber: event.blockNumber?.toString() ?? '',
      blockTimestamp: block?.timestamp?.toString() ?? '',
      transactionHash: event.transactionHash,
      sp: {
        branchId: contracts.collaterals.findIndex(collateral => isAddressEqual(collateral.contracts.StabilityPool.address, event.address)) as CollIndex,
        address: event.address,
      }
    }
  })) as SPDepositUpdatedLogs[];

  return {
    logs: recentLogs,
    lastQueriedFromBlock: fromBlock.toString(),
    lastQueriedToBlock: latestBlock.toString(),
  };
}

export async function queryStabilityPoolDepositUpdatedEventsWithinTimestampRange(params?: {
  fromTimestamp?: number
  toTimestamp?: number
}) {
  const { fromTimestamp, toTimestamp } = params ?? {};

  const db = getDb();

  let conditions: SQL | undefined = undefined;
  if (fromTimestamp && toTimestamp) {
    conditions = and(gte(spDepositEvents.blockTimestamp, BigInt(fromTimestamp * 1000)), lte(spDepositEvents.blockTimestamp, BigInt(toTimestamp * 1000)));
  } else if (fromTimestamp) {
    conditions = gte(spDepositEvents.blockTimestamp, BigInt(fromTimestamp * 1000));
  } else if (toTimestamp) {
    conditions = lte(spDepositEvents.blockTimestamp, BigInt(toTimestamp * 1000));
  }

  if (conditions) {
    return await db.select().from(spDepositEvents).where(conditions).orderBy(spDepositEvents.createdAt);
  }

  return await db.select().from(spDepositEvents).orderBy(spDepositEvents.createdAt);
}

export async function saveEventsToDatabase(logs: SPDepositUpdatedLogs[]) {
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

    console.log(`Saved ${logs.length} SP deposit events to database`);
  } catch (error) {
    console.error('Error saving SP deposit events to database:', error);
    throw error;
  }
}

async function getEventQueryState() {
  const db = getDb();

  try {
    const state = await db
      .select()
      .from(eventQueryState)
      .where(eq(eventQueryState.eventType, EVENT_TYPE))
      .limit(1);

    if (state.length > 0) {
      return {
        lastQueriedFromBlock: state[0]?.lastQueriedFromBlock ?? '',
        lastQueriedToBlock: state[0]?.lastQueriedToBlock ?? '',
      };
    }

    return {
      lastQueriedFromBlock: '',
      lastQueriedToBlock: '',
    };
  } catch (error) {
    console.error('Error fetching event query state:', error);
    return {
      lastQueriedFromBlock: '',
      lastQueriedToBlock: '',
    };
  }
}

async function updateEventQueryState(fromBlock: string, toBlock: string) {
  const db = getDb();

  try {
    const existing = await db
      .select()
      .from(eventQueryState)
      .where(eq(eventQueryState.eventType, EVENT_TYPE))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(eventQueryState)
        .set({
          lastQueriedFromBlock: fromBlock,
          lastQueriedToBlock: toBlock,
          updatedAt: new Date(),
        })
        .where(eq(eventQueryState.eventType, EVENT_TYPE));
    } else {
      await db.insert(eventQueryState).values({
        eventType: EVENT_TYPE,
        lastQueriedFromBlock: fromBlock,
        lastQueriedToBlock: toBlock,
      });
    }

    console.log(`Updated event query state: from ${fromBlock} to ${toBlock}`);
  } catch (error) {
    console.error('Error updating event query state:', error);
    throw error;
  }
}
import { isAddressEqual } from 'viem';
import type { Address, Hash } from 'viem';
import type { CollIndex } from '@/src/types';
import { getPublicClient } from '@/src/utils/client';
import { getContracts } from '@/src/lib/contracts';
import { ORIGIN_BLOCK } from '../utils/constants';
import { getDb } from '@/src/db/connection';
import { eventQueryState, spDepositEvents, liquidationLogs, interestRewardsLogs, spDepositSnapshots } from '@/src/db/schema';
import { and, eq, gte, lte, SQL } from 'drizzle-orm';
import type {
  DepositUpdatedEventLog,
  DepositUpdatedQueryResult,
  EventQueryState,
  InterestRewardLog,
  LiquidationLogs,
  SPDepositUpdatedLogs,
  StabilityPoolSnapshot,
} from './types';
import { StabilityPool } from '../abi/StabilityPool';

const EVENT_TYPE = 'SP_DEPOSIT_UPDATED';
const LOGS_BLOCK_CHUNK = 9000n;

export async function getStabilityPoolTotalDepositsAndCollBalances(): Promise<StabilityPoolSnapshot[]> {
  const client = getPublicClient();
  const contracts = getContracts();

  let results: bigint[] = [];
  const calls = contracts.collaterals.map(collateral => [
    {
      ...collateral.contracts.StabilityPool,
      functionName: 'getTotalBoldDeposits',
    },
    {
      ...collateral.contracts.StabilityPool,
      functionName: 'getCollBalance',
    }
  ]).flat();

  try {
    results = await client.multicall({
      allowFailure: false,
      contracts: calls,
    }) as bigint[];
  } catch (error) {
    console.log("Error getting stability pool total deposits and collateral balances via multicall:", error);
    console.log("Looping instead...")
    for (const call of calls) {
      const result = await client.readContract(call as any);
      results.push(result as bigint);
    }
  }

  const latestBlock = await client.getBlockNumber();
  const block = await client.getBlock({ blockNumber: latestBlock });

  const data: StabilityPoolSnapshot[] = contracts.collaterals.map((collateral, index) => ({
    branchId: collateral.collIndex,
    stabilityPool: collateral.contracts.StabilityPool.address,
    totalBoldDeposits: results[index * 2]!.toString(),
    collBalance: results[index * 2 + 1]!.toString(),
    blockNumber: latestBlock.toString(),
    blockTimestamp: block.timestamp.toString() ?? '',
  }));

  return data;
}

export async function queryAndSaveStabilityPoolTotalDepositsAndCollBalancesToDatabase(): Promise<void> {
  const db = getDb();
  const data = await getStabilityPoolTotalDepositsAndCollBalances();

  try {
    const result = await db.insert(spDepositSnapshots).values(data.map(item => ({
      branchId: item.branchId,
      stabilityPool: item.stabilityPool,
      totalBoldDeposits: item.totalBoldDeposits,
      totalCollBalance: item.collBalance,
      blockNumber: BigInt(item.blockNumber),
      blockTimestamp: BigInt(item.blockTimestamp),
    }))).returning();

    console.log(`Saved ${result.length} SP deposit snapshots to database`);
  } catch (error) {
    console.error('Error saving SP deposit snapshots to database:', error);
    throw error;
  }
}

export async function queryAndLogStabilityPoolDepositUpdatedEvents(): Promise<DepositUpdatedQueryResult> {
  const lastQueriedData = await queryStabilityPoolDepositUpdatedEvents();
  
  if (lastQueriedData.logs.length > 0) {
    await saveSPDepositedEventsToDatabase(lastQueriedData.logs);
    await updateEventQueryState(EVENT_TYPE, lastQueriedData.lastQueriedFromBlock, lastQueriedData.lastQueriedToBlock);
  }

  return lastQueriedData;
}

export async function queryStabilityPoolDepositUpdatedEvents(): Promise<DepositUpdatedQueryResult> {
  const client = getPublicClient();
  const contracts = getContracts();

  const queryState = await getEventQueryState(EVENT_TYPE);

  const fromBlock = queryState.lastQueriedToBlock ? BigInt(queryState.lastQueriedToBlock) : ORIGIN_BLOCK;
  const latestBlock = await client.getBlockNumber();
  
  const events: DepositUpdatedEventLog[] = [];
  let currentFromBlock = fromBlock;
  while (currentFromBlock <= latestBlock) {
    const currentToBlock = currentFromBlock + LOGS_BLOCK_CHUNK < latestBlock
      ? currentFromBlock + LOGS_BLOCK_CHUNK
      : latestBlock;

    const chunkEvents = await client.getContractEvents({
      address: contracts.collaterals.map(collateral => collateral.contracts.StabilityPool.address),
      abi: StabilityPool,
      eventName: 'DepositUpdated',
      strict: true,
      fromBlock: currentFromBlock,
      toBlock: currentToBlock,
    });

    events.push(...chunkEvents);
    currentFromBlock = currentToBlock + 1n;
  }

  const recentLogs: SPDepositUpdatedLogs[] = await Promise.all(events.map(async event => {
    const block = event.blockNumber ? await client.getBlock({ blockNumber: event.blockNumber }) : null;
    const { _depositor, _newDeposit, _stashedColl } = event.args ?? {};
    return {
      depositor: _depositor as Address,
      depositAmount: (_newDeposit ?? 0n).toString(),
      stashedColl: (_stashedColl ?? 0n).toString(),
      blockNumber: event.blockNumber?.toString() ?? '',
      blockTimestamp: block?.timestamp?.toString() ?? '',
      transactionHash: event.transactionHash as Hash,
      sp: {
        branchId: contracts.collaterals.findIndex(collateral =>
          isAddressEqual(collateral.contracts.StabilityPool.address, event.address as Address),
        ) as CollIndex,
        address: event.address as Address,
      }
    };
  }));

  return {
    logs: recentLogs,
    lastQueriedFromBlock: fromBlock.toString(),
    lastQueriedToBlock: latestBlock.toString(),
  };
}

export async function queryStabilityPoolDepositUpdatedEventsWithinTimestampRange(params?: {
  fromTimestamp?: number;
  toTimestamp?: number;
}): Promise<typeof spDepositEvents.$inferSelect[]> {
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

export async function saveSPDepositedEventsToDatabase(logs: SPDepositUpdatedLogs[]): Promise<void> {
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

export async function saveInterestRewardsToDatabase(logs: InterestRewardLog[]): Promise<void> {
  const db = getDb();
  try {
    await db.insert(interestRewardsLogs).values(logs.map(log => ({
      branchId: log.branchId,
      stabilityPool: log.stabilityPool,
      amount: log.amount,
      blockNumber: BigInt(log.blockNumber),
      blockTimestamp: BigInt(log.blockTimestamp),
      transactionHash: log.transactionHash,
    })));
    console.log(`Saved ${logs.length} interest rewards (ERC20 transfer logs) to database`);
  } catch (error) {
    console.error('Error saving interest rewards (ERC20 transfer logs) to database:', error);
    throw error;
  }
}

export async function saveLiquidationEventsToDatabase(logs: LiquidationLogs[]): Promise<void> {
  const db = getDb();
  try {
    await db.insert(liquidationLogs).values(logs.map(log => ({
      debtOffsetBySP: log.debtOffsetBySP,
      debtRedistributed: log.debtRedistributed,
      boldGasCompensation: log.boldGasCompensation,
      collGasCompensation: log.collGasCompensation,
      collSentToSP: log.collSentToSP,
      collRedistributed: log.collRedistributed,
      collSurplus: log.collSurplus,
      L_ETH: log.L_ETH,
      L_boldDebt: log.L_boldDebt,
      price: log.price,
      blockNumber: BigInt(log.blockNumber),
      blockTimestamp: BigInt(log.blockTimestamp),
      transactionHash: log.transactionHash,
    })));
    console.log(`Saved ${logs.length} liquidation events to database`);
  } catch (error) {
    console.error('Error saving liquidation events to database:', error);
    throw error;
  }
}

async function getEventQueryState(eventType: string): Promise<EventQueryState> {
  const db = getDb();

  try {
    const state = await db
      .select()
      .from(eventQueryState)
      .where(eq(eventQueryState.eventType, eventType))
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

async function updateEventQueryState(eventType: string, fromBlock: string, toBlock: string): Promise<void> {
  const db = getDb();

  try {
    const existing = await db
      .select()
      .from(eventQueryState)
      .where(eq(eventQueryState.eventType, eventType))
      .limit(1);

    if (existing.length > 0) {
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
    console.error(`Error updating event query state for ${eventType}:`, error);
    throw error;
  }
}

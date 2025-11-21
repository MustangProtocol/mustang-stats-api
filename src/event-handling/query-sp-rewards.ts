// Track interest reward mints + liquidation rewards to the stability pool
import { getPublicClient } from '@/src/utils/client';
import { getContracts } from '@/src/lib/contracts';
import { ORIGIN_BLOCK } from '../utils/constants';
import type {
  InterestRewardLog,
  InterestRewardQueryResult,
  LiquidationEventLog,
  LiquidationLogs,
  LiquidationQueryResult,
  TransferEventLog,
} from './types';
import type { Address, Hash } from 'viem';
import { erc20Abi, isAddressEqual, zeroAddress } from 'viem';
import { getEventQueryStateByType, updateEventQueryStateInDb } from './db';
import { saveInterestRewardsToDatabase, saveLiquidationEventsToDatabase } from './query-sp-deposits';
import type { CollIndex } from '../types';
import { TroveManager } from '../abi/TroveManager';

const TRANSFER_EVENT_TYPE = 'TRANSFER';
const LIQUIDATION_EVENT_TYPE = 'LIQUIDATION';
const LOGS_BLOCK_CHUNK = 9000n;

// Get Transfer logs of BoldToken from null address to the stability pool
export async function queryStabilityPoolInterestRewardMintedEvents(): Promise<InterestRewardQueryResult> {
  const client = getPublicClient();
  const contracts = getContracts();

  const queryState = await getEventQueryStateByType(TRANSFER_EVENT_TYPE);

  const fromBlock = queryState?.lastQueriedToBlock ? BigInt(queryState.lastQueriedToBlock) : ORIGIN_BLOCK;
  const latestBlock = await client.getBlockNumber();

  console.log("Querying interest reward minted events from block", fromBlock, "to block", latestBlock);

  const events: TransferEventLog[] = [];
  let currentFromBlock = fromBlock;
  while (currentFromBlock <= latestBlock) {
    const currentToBlock = currentFromBlock + LOGS_BLOCK_CHUNK < latestBlock
      ? currentFromBlock + LOGS_BLOCK_CHUNK
      : latestBlock;

    const chunkEvents = await client.getContractEvents({
      address: contracts.BoldToken.address,
      abi: erc20Abi,
      eventName: 'Transfer',
      strict: true,
      fromBlock: currentFromBlock,
      toBlock: currentToBlock,
      args: {
        to: contracts.collaterals.map(collateral => collateral.contracts.StabilityPool.address),
        from: zeroAddress,
      },
    });

    events.push(...chunkEvents);
    currentFromBlock = currentToBlock + 1n;
  }

  console.log("Found", events.length, "interest reward minted (ERC20 transfer) events");

  const recentLogs: InterestRewardLog[] = await Promise.all(events.map(async (event, i) => {
    let block: { timestamp: bigint } | null;
    try {
      block = event.blockNumber ? await client.getBlock({ blockNumber: event.blockNumber }) : null;
    } catch (error) {
      console.log("Error getting block for event", i, error);
      block = null;
    }
    const { from, to, value } = event.args ?? {};
    return {
      branchId: contracts.collaterals.findIndex(collateral =>
        isAddressEqual(collateral.contracts.StabilityPool.address, to as Address),
      ) as CollIndex,
      stabilityPool: to as Address,
      amount: (value ?? 0n).toString(),
      blockNumber: event.blockNumber?.toString() ?? '',
      blockTimestamp: block?.timestamp?.toString() ?? '',
      transactionHash: event.transactionHash as Hash,
    };
  }));

  return {
    logs: recentLogs,
    lastQueriedFromBlock: fromBlock.toString(),
    lastQueriedToBlock: latestBlock.toString(),
  };
}

export async function queryAndLogStabilityPoolInterestRewardMintedEvents(): Promise<InterestRewardQueryResult> {
  const lastQueriedData = await queryStabilityPoolInterestRewardMintedEvents();
  if (lastQueriedData.logs.length > 0) {
    console.log("Saving", lastQueriedData.logs.length, "interest reward events to database...");
    await saveInterestRewardsToDatabase(lastQueriedData.logs);
    console.log("Updated event query state for", TRANSFER_EVENT_TYPE);
    await updateEventQueryStateInDb(TRANSFER_EVENT_TYPE, lastQueriedData.lastQueriedFromBlock, lastQueriedData.lastQueriedToBlock);
  }
  return lastQueriedData;
}

// Liquidation rewards to the stability pool
export async function queryStabilityPoolLiquidationRewardMintedEvents(): Promise<LiquidationQueryResult> {
  const client = getPublicClient();
  const contracts = getContracts();

  const queryState = await getEventQueryStateByType(LIQUIDATION_EVENT_TYPE);

  const fromBlock = queryState?.lastQueriedToBlock ? BigInt(queryState.lastQueriedToBlock) : ORIGIN_BLOCK;
  const latestBlock = await client.getBlockNumber();

  const events: LiquidationEventLog[] = [];
  let currentFromBlock = fromBlock;
  while (currentFromBlock <= latestBlock) {
    const currentToBlock = currentFromBlock + LOGS_BLOCK_CHUNK < latestBlock
      ? currentFromBlock + LOGS_BLOCK_CHUNK
      : latestBlock;

    const chunkEvents = await client.getContractEvents({
      address: contracts.collaterals.map(collateral => collateral.contracts.TroveManager.address),
      abi: TroveManager,
      eventName: 'Liquidation',
      strict: true,
      fromBlock: currentFromBlock,
      toBlock: currentToBlock,
    });

    events.push(...chunkEvents);
    currentFromBlock = currentToBlock + 1n;
  }

  console.log("Found", events.length, "liquidation events");

  const recentLogs: LiquidationLogs[] = await Promise.all(events.map(async (event, i) => {
    let block: { timestamp: bigint } | null;
    try {
      block = event.blockNumber ? await client.getBlock({ blockNumber: event.blockNumber }) : null;
    } catch (error) {
      console.log("Error getting block for event", i, error);
      block = null;
    }
    const {
      _debtOffsetBySP,
      _debtRedistributed,
      _boldGasCompensation,
      _collGasCompensation,
      _collSentToSP,
      _collRedistributed,
      _collSurplus,
      _L_ETH,
      _L_boldDebt,
      _price,
    } = event.args ?? {};

    return {
      debtOffsetBySP: (_debtOffsetBySP ?? 0n).toString(),
      debtRedistributed: (_debtRedistributed ?? 0n).toString(),
      boldGasCompensation: (_boldGasCompensation ?? 0n).toString(),
      collGasCompensation: (_collGasCompensation ?? 0n).toString(),
      collSentToSP: (_collSentToSP ?? 0n).toString(),
      collRedistributed: (_collRedistributed ?? 0n).toString(),
      collSurplus: (_collSurplus ?? 0n).toString(),
      L_ETH: (_L_ETH ?? 0n).toString(),
      L_boldDebt: (_L_boldDebt ?? 0n).toString(),
      price: (_price ?? 0n).toString(),
      blockNumber: event.blockNumber?.toString() ?? '',
      blockTimestamp: block?.timestamp?.toString() ?? '',
      transactionHash: event.transactionHash as Hash,
    };
  }));

  return {
    logs: recentLogs,
    lastQueriedFromBlock: fromBlock.toString(),
    lastQueriedToBlock: latestBlock.toString(),
  };
}

export async function queryAndLogStabilityPoolLiquidationRewardMintedEvents(): Promise<LiquidationQueryResult> {
  const lastQueriedData = await queryStabilityPoolLiquidationRewardMintedEvents();
  if (lastQueriedData.logs.length > 0) {
    console.log("Saving", lastQueriedData.logs.length, "liquidation events to database...");
    await saveLiquidationEventsToDatabase(lastQueriedData.logs);
    console.log("Updated event query state for", LIQUIDATION_EVENT_TYPE);
    await updateEventQueryStateInDb(LIQUIDATION_EVENT_TYPE, lastQueriedData.lastQueriedFromBlock, lastQueriedData.lastQueriedToBlock);
  }
  return lastQueriedData;
}

// Track interest reward mints + liquidation rewards to the stability pool
import { getPublicClient } from '@/src/utils/client';
import { getContracts } from '@/src/lib/contracts';
import { ORIGIN_BLOCK } from '../utils/constants';
import type { InterestRewardLog, LiquidationLogs } from './types';
import { isAddressEqual, parseAbiItem, zeroAddress } from 'viem';
import { getEventQueryStateByType, updateEventQueryStateInDb } from './db';
import { saveInterestRewardsToDatabase, saveLiquidationEventsToDatabase } from './query-sp-deposits';
import type { CollIndex } from '../types';

const TRANSFER_EVENT_TYPE = 'TRANSFER';
const LIQUIDATION_EVENT_TYPE = 'LIQUIDATION';

// Get Transfer logs of BoldToken from null address to the stability pool
export async function queryStabilityPoolInterestRewardMintedEvents() {
  const client = getPublicClient();
  const contracts = getContracts();

  let queryState = await getEventQueryStateByType(TRANSFER_EVENT_TYPE);

  const fromBlock = queryState?.lastQueriedToBlock ? BigInt(queryState.lastQueriedToBlock) : ORIGIN_BLOCK;
  const latestBlock = await client.getBlockNumber();

  const filter = await client.createContractEventFilter({
    address: contracts.BoldToken.address,
    abi: [parseAbiItem('event Transfer(address indexed from,address indexed to,uint256 value)')],
    eventName: 'Transfer',
    strict: true,
    fromBlock,
    toBlock: latestBlock,
    args: {
      to: contracts.collaterals.map(collateral => collateral.contracts.StabilityPool.address),
      from: zeroAddress,
    }
  });

  const events = await client.getContractEvents(filter);

  const recentLogs = await Promise.all(events.map(async event => {
    const block = event.blockNumber ? await client.getBlock({ blockNumber: event.blockNumber }) : null;
    return {
      branchId: contracts.collaterals.findIndex(collateral => isAddressEqual(collateral.contracts.StabilityPool.address, event.args.to)) as CollIndex,
      stabilityPool: event.args.to,
      amount: event.args.value.toString(),
      blockNumber: event.blockNumber?.toString() ?? '',
      blockTimestamp: block?.timestamp?.toString() ?? '',
      transactionHash: event.transactionHash,
    }
  })) as InterestRewardLog[];

  return {
    logs: recentLogs,
    lastQueriedFromBlock: fromBlock.toString(),
    lastQueriedToBlock: latestBlock.toString(),
  };
}

export async function queryAndLogStabilityPoolInterestRewardMintedEvents() {
  const lastQueriedData = await queryStabilityPoolInterestRewardMintedEvents();
  if (lastQueriedData.logs.length > 0) {
    await saveInterestRewardsToDatabase(lastQueriedData.logs);
    await updateEventQueryStateInDb(TRANSFER_EVENT_TYPE, lastQueriedData.lastQueriedFromBlock, lastQueriedData.lastQueriedToBlock);
  }
  return lastQueriedData;
}

// Liquidation rewards to the stability pool
export async function queryStabilityPoolLiquidationRewardMintedEvents() {
  const client = getPublicClient();
  const contracts = getContracts();

  let queryState = await getEventQueryStateByType(LIQUIDATION_EVENT_TYPE);

  const fromBlock = queryState?.lastQueriedToBlock ? BigInt(queryState.lastQueriedToBlock) : ORIGIN_BLOCK;
  const latestBlock = await client.getBlockNumber();

  const filter = await client.createContractEventFilter({
    address: contracts.collaterals.map(collateral => collateral.contracts.TroveManager.address),
    abi: [parseAbiItem('event Liquidation(uint256 _debtOffsetBySP,uint256 _debtRedistributed,uint256 _boldGasCompensation,uint256 _collGasCompensation,uint256 _collSentToSP,uint256 _collRedistributed,uint256 _collSurplus,uint256 _L_ETH,uint256 _L_boldDebt,uint256 _price)')],
    eventName: 'Liquidation',
    strict: true,
    fromBlock,
    toBlock: latestBlock,
  });

  const events = await client.getContractEvents(filter);

  const recentLogs = await Promise.all(events.map(async event => {
    const block = event.blockNumber ? await client.getBlock({ blockNumber: event.blockNumber }) : null;
    return {
      debtOffsetBySP: event.args._debtOffsetBySP.toString(),
      debtRedistributed: event.args._debtRedistributed.toString(),
      boldGasCompensation: event.args._boldGasCompensation.toString(),
      collGasCompensation: event.args._collGasCompensation.toString(),
      collSentToSP: event.args._collSentToSP.toString(),
      collRedistributed: event.args._collRedistributed.toString(),
      collSurplus: event.args._collSurplus.toString(),
      L_ETH: event.args._L_ETH.toString(),
      L_boldDebt: event.args._L_boldDebt.toString(),
      price: event.args._price.toString(),
      blockNumber: event.blockNumber?.toString() ?? '',
      blockTimestamp: block?.timestamp?.toString() ?? '',
      transactionHash: event.transactionHash,
    }
  })) as LiquidationLogs[];

  return {
    logs: recentLogs,
    lastQueriedFromBlock: fromBlock.toString(),
    lastQueriedToBlock: latestBlock.toString(),
  };
}

export async function queryAndLogStabilityPoolLiquidationRewardMintedEvents() {
  const lastQueriedData = await queryStabilityPoolLiquidationRewardMintedEvents();
  if (lastQueriedData.logs.length > 0) {
    await saveLiquidationEventsToDatabase(lastQueriedData.logs);
    await updateEventQueryStateInDb(LIQUIDATION_EVENT_TYPE, lastQueriedData.lastQueriedFromBlock, lastQueriedData.lastQueriedToBlock);
  }
  return lastQueriedData;
}
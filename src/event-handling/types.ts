import { erc20Abi } from "viem";
import type { Address, GetContractEventsReturnType } from "viem";
import { StabilityPool } from "../abi/StabilityPool";
import { TroveManager } from "../abi/TroveManager";
import type { CollIndex } from "../types";

export interface ERC20TransferLogs {
  token: Address,
  to: Address,
  from: Address,
  amount: string,
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
}

export interface InterestRewardLog {
  branchId: CollIndex
  stabilityPool: Address
  amount: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
}

export interface SPDepositUpdatedLogs {
  depositor: Address
  depositAmount: string
  stashedColl: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
  sp: {
    branchId: CollIndex
    address: Address
  }
}

export interface LiquidationLogs {
  debtOffsetBySP: string
  debtRedistributed: string
  boldGasCompensation: string
  collGasCompensation: string
  collSentToSP: string
  collRedistributed: string
  collSurplus: string
  L_ETH: string
  L_boldDebt: string
  price: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
}

export type StabilityPoolSnapshot = {
  branchId: CollIndex
  stabilityPool: Address
  totalBoldDeposits: string
  collBalance: string
  blockNumber: string
  blockTimestamp: string
}

export type DepositUpdatedQueryResult = {
  logs: SPDepositUpdatedLogs[]
  lastQueriedFromBlock: string
  lastQueriedToBlock: string
}

export type InterestRewardQueryResult = {
  logs: InterestRewardLog[]
  lastQueriedFromBlock: string
  lastQueriedToBlock: string
}

export type LiquidationQueryResult = {
  logs: LiquidationLogs[]
  lastQueriedFromBlock: string
  lastQueriedToBlock: string
}

export type EventQueryState = {
  lastQueriedFromBlock: string
  lastQueriedToBlock: string
}

export type DepositUpdatedEventLog = GetContractEventsReturnType<
  typeof StabilityPool,
  'DepositUpdated'
>[number]

export type TransferEventLog = GetContractEventsReturnType<
  typeof erc20Abi,
  'Transfer'
>[number]

export type LiquidationEventLog = GetContractEventsReturnType<
  typeof TroveManager,
  'Liquidation'
>[number]

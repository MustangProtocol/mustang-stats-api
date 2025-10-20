import type { Address } from "viem"
import type { CollIndex } from "../types"

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
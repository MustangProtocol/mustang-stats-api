import type { Address } from "viem";

export type CollIndex = 0 | 1 | 2 | 3;
export type TroveId = `0x${string}`;
export type PrefixedTroveId = `${CollIndex}:${TroveId}`;
export type CollateralSymbol = "ETH" | "WETH" | "RETH" | "TBTC" | "SAGA";

export type TokenSymbol =
  | "MUST"
  | "ETH"
  | "WETH"
  | "RETH"
  | "TBTC"
  | "SAGA"

export type Token = {
  name: string;
  symbol: TokenSymbol;
};

export type CollateralToken = Token & {
  collateralRatio: number;
  symbol: CollateralSymbol;
}

export interface CombinedTroveData {
  id: bigint;
  entireDebt: bigint;
  entireColl: bigint;
  redistBoldDebtGain: bigint;
  redistCollGain: bigint;
  accruedInterest: bigint;
  recordedDebt: bigint;
  annualInterestRate: bigint;
  accruedBatchManagementFee: bigint;
  lastInterestRateAdjTime: bigint;
  stake: bigint;
  lastDebtUpdateTime: bigint;
  interestBatchManager: Address;
  batchDebtShares: bigint;
  snapshotETH: bigint;
  snapshotBoldDebt: bigint;
}

export interface ReturnCombinedTroveReadCallData {
  id: string;
  troveId: string;
  borrower: Address;
  debt: bigint;
  deposit: bigint;
  interestRate: bigint;
  status: TroveStatus;
  collateral: {
    id: string;
    token: {
      symbol: string;
      name: string;
    };
    minCollRatio: number;
    collIndex: number;
  }
  interestBatch: {
    annualInterestRate: bigint;
    batchManager: Address;
  }
  entireDebt: bigint;
  entireColl: bigint;
  redistBoldDebtGain: bigint;
  redistCollGain: bigint;
  accruedInterest: bigint;
  recordedDebt: bigint;
  annualInterestRate: bigint;
  accruedBatchManagementFee: bigint;
  lastInterestRateAdjTime: bigint;
  stake: bigint;
  lastDebtUpdateTime: bigint;
  interestBatchManager: Address;
  batchDebtShares: bigint;
  snapshotETH: bigint;
  snapshotBoldDebt: bigint;
}

export type DebtPerInterestRate = {
  interestBatchManager: Address;
  interestRate: bigint;
  debt: bigint;
}

export enum TroveStatus {
  nonExistent,
  active,
  closedByOwner,
  closedByLiquidation,
  zombie
}

export interface Trove {
  debt: bigint;
  coll: bigint;
  stake: bigint;
  status: TroveStatus;
  arrayIndex: bigint;
  lastDebtUpdateTime: bigint;
  lastInterestRateAdjTime: bigint;
  annualInterestRate: bigint;
  interestBatchManager: Address;
  batchDebtShares: bigint;
}

export interface ReturnTroveReadCallData extends Trove {
  id: string;
  troveId: string;
  borrower: Address;
  deposit: bigint;
  interestRate: bigint;
  collateral: {
    id: string;
    token: {
      symbol: string;
      name: string;
    };
    minCollRatio: number;
    collIndex: number;
  }
  interestBatch: {
    annualInterestRate: bigint;
    batchManager: Address;
  }
}
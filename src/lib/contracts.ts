import { ActivePool } from "@/src/abi/ActivePool";
import { BorrowerOperations } from "@/src/abi/BorrowerOperations";
import { CollateralRegistry } from "@/src/abi/CollateralRegistry";
import { CollSurplusPool } from "@/src/abi/CollSurplusPool";
import { DefaultPool } from "@/src/abi/DefaultPool";
import { ExchangeHelpers } from "@/src/abi/ExchangeHelpers";
import { Governance } from "@/src/abi/Governance";
import { HintHelpers } from "@/src/abi/HintHelpers";
import { LeverageLSTZapper } from "@/src/abi/LeverageLSTZapper";
import { LeverageWETHZapper } from "@/src/abi/LeverageWETHZapper";
import { MultiTroveGetter } from "@/src/abi/MultiTroveGetter";
import { PriceFeed } from "@/src/abi/PriceFeed";
import { SortedTroves } from "@/src/abi/SortedTroves";
import { StabilityPool } from "@/src/abi/StabilityPool";
import { TroveManager } from "@/src/abi/TroveManager";
import { TroveNFT } from "@/src/abi/TroveNFT";
import { type Address, erc20Abi, zeroAddress } from "viem";
import { CONTRACT_ADDRESSES } from "@/src/addresses";
import type { CollIndex, CollateralSymbol } from "@/src/types";

const protocolAbis = {
  BoldToken: erc20Abi,
  CollateralRegistry,
  ExchangeHelpers,
  Governance,
  HintHelpers,
  MultiTroveGetter,
  WETH: erc20Abi,
} as const;

const BorrowerOperationsErrorsAbi = BorrowerOperations.filter((f) => f.type === "error");

const collateralAbis = {
  ActivePool,
  BorrowerOperations,
  CollSurplusPool,
  CollToken: erc20Abi,
  DefaultPool,
  LeverageLSTZapper: [
    ...LeverageLSTZapper,
    ...BorrowerOperationsErrorsAbi,
  ],
  LeverageWETHZapper: [
    ...LeverageWETHZapper,
    ...BorrowerOperationsErrorsAbi,
  ],
  PriceFeed,
  SortedTroves,
  StabilityPool,
  TroveManager,
  TroveNFT,
} as const;

const abis = {
  ...protocolAbis,
  ...collateralAbis,
} as const;

type ProtocolContractMap = {
  [K in keyof typeof protocolAbis]: Contract<K>;
};

type ProtocolContractName = keyof ProtocolContractMap;
type CollateralContractName = keyof typeof collateralAbis;
type ContractName = ProtocolContractName | CollateralContractName;

// A contract represented by its ABI and address
type Contract<T extends ContractName> = {
  abi: T extends ProtocolContractName ? typeof protocolAbis[T]
    : T extends CollateralContractName ? typeof collateralAbis[T]
    : never;
  address: Address;
};

type CollateralContracts = {
  [K in CollateralContractName]: Contract<K>;
};

type Collaterals = Array<{
  collIndex: CollIndex;
  contracts: CollateralContracts;
  symbol: CollateralSymbol;
}>;

export type Contracts = ProtocolContractMap & {
  collaterals: Collaterals;
};

const CONTRACTS: Contracts = {
  BoldToken: { abi: abis.BoldToken, address: CONTRACT_ADDRESSES.boldToken as Address },
  CollateralRegistry: { abi: abis.CollateralRegistry, address: CONTRACT_ADDRESSES.collateralRegistry as Address },
  Governance: { abi: abis.Governance, address: CONTRACT_ADDRESSES.governance as Address },
  ExchangeHelpers: { abi: abis.ExchangeHelpers, address: CONTRACT_ADDRESSES.exchangeHelpers as Address },
  HintHelpers: { abi: abis.HintHelpers, address: CONTRACT_ADDRESSES.hintHelpers as Address },
  MultiTroveGetter: { abi: abis.MultiTroveGetter, address: CONTRACT_ADDRESSES.multiTroveGetter as Address },
  WETH: { abi: abis.WETH, address: CONTRACT_ADDRESSES.weth as Address },
  collaterals: CONTRACT_ADDRESSES.branches.map((branch) => ({
    collIndex: branch.collIndex as CollIndex,
    symbol: branch.collSymbol as CollateralSymbol,
    contracts: {
      ActivePool: { address: branch.activePool as Address, abi: abis.ActivePool },
      BorrowerOperations: { address: branch.borrowerOperations as Address, abi: abis.BorrowerOperations },
      CollSurplusPool: { address: branch.collSurplusPool as Address, abi: abis.CollSurplusPool },
      CollToken: { address: branch.collToken as Address, abi: abis.CollToken },
      DefaultPool: { address: branch.defaultPool as Address, abi: abis.DefaultPool },
      LeverageLSTZapper: {
        address: (branch.collSymbol === "ETH" ? zeroAddress : branch.leverageZapper) as Address,
        abi: abis.LeverageLSTZapper,
      },
      LeverageWETHZapper: {
        address: (branch.collSymbol === "ETH" ? zeroAddress : branch.wethZapper) as Address,
        abi: abis.LeverageWETHZapper,
      },
      PriceFeed: { address: branch.priceFeed as Address, abi: abis.PriceFeed },
      SortedTroves: { address: branch.sortedTroves as Address, abi: abis.SortedTroves },
      StabilityPool: { address: branch.stabilityPool as Address, abi: abis.StabilityPool },
      TroveManager: { address: branch.troveManager as Address, abi: abis.TroveManager },
      TroveNFT: { address: branch.troveNFT as Address, abi: abis.TroveNFT },
    },
  })),
};

export function getContracts(): Contracts {
  return CONTRACTS;
}

export function getProtocolContract<CN extends ProtocolContractName>(
  name: CN,
): ProtocolContractMap[CN] {
  return CONTRACTS[name];
}

export function getCollateralContracts(
  collIndexOrSymbol: CollateralSymbol | CollIndex | null,
): CollateralContracts | null {
  if (collIndexOrSymbol === null) {
    return null;
  }
  const { collaterals } = getContracts();
  const collateral = typeof collIndexOrSymbol === "number"
    ? collaterals[collIndexOrSymbol]
    : collaterals.find((c) => c.symbol === collIndexOrSymbol);
  return collateral?.contracts ?? null;
}

export function getCollateralContract<CN extends CollateralContractName>(
  collIndexOrSymbol: CollateralSymbol | CollIndex | null,
  contractName: CN,
): Contract<CN> | null {
  const contracts = getCollateralContracts(collIndexOrSymbol);
  return contracts?.[contractName] ?? null;
}

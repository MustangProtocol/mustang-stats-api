import { getContracts } from "@/src/lib/contracts";
import {
  type CollIndex,
  type DebtPerInterestRate,
} from "@/src/types";
import { getPublicClient } from "@/src/utils/client";


export async function getAllDebtPerInterestRate(): Promise<Record<CollIndex, DebtPerInterestRate[]>> {
  const { collaterals, MultiTroveGetter } = getContracts()
  const client = getPublicClient()
  const debtPerInterestRate: Record<CollIndex, DebtPerInterestRate[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  }

  const output = await client.multicall({
    contracts: collaterals.map(collateral => ({
      ...MultiTroveGetter,
      functionName: "getDebtPerInterestRateAscending",
      args: [collateral.collIndex, 0n, 10n],
    })),
  })

  output.forEach((list, index) => {
    if (list.status === "success") {
      debtPerInterestRate[index as CollIndex] = (list.result as unknown as [DebtPerInterestRate[], bigint])[0];
    }
  })

  return debtPerInterestRate;
}
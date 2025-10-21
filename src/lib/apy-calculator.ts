import { getDb } from '../db/connection';
import { interestRewardsLogs, liquidationLogs, spDepositSnapshots } from '../db/schema';
import { and, gte, lte } from 'drizzle-orm';

export interface ApyCalculationResult {
  branchId: number;
  totalInterestRewards: string;
  totalCollBalance: string;
  totalBoldDepositAvg: string;
  apy: string;
  periodStart: bigint;
  periodEnd: bigint;
  dataPoints: {
    interestRewardsCount: number;
    liquidationLogsCount: number;
    spDepositSnapshotsCount: number;
  };
}

/**
 * Calculate APY for a given branch within a timestamp range
 * Formula: (sum of interest rewards + sum of (collSentToSP * price)) / average total bold deposit
 * 
 * @param branchId - The branch ID to calculate APY for
 * @param fromTimestamp - Start timestamp (inclusive)
 * @param toTimestamp - End timestamp (inclusive)
 * @returns ApyCalculationResult with detailed breakdown
 */
export async function calculateApyForBranch(
  branchId: number,
  fromTimestamp: bigint,
  toTimestamp: bigint
): Promise<ApyCalculationResult> {
  const db = getDb();

  try {
    // Fetch interest rewards for the period
    const interestRewards = await db
      .select()
      .from(interestRewardsLogs)
      .where(
        and(
          ...(branchId !== -1 ? [gte(interestRewardsLogs.branchId, branchId)] : []),
          gte(interestRewardsLogs.blockTimestamp, fromTimestamp),
          lte(interestRewardsLogs.blockTimestamp, toTimestamp)
        )
      );

    // Fetch liquidation logs for the period
    const liquidations = await db
      .select()
      .from(liquidationLogs)
      .where(
        and(
          gte(liquidationLogs.blockTimestamp, fromTimestamp),
          lte(liquidationLogs.blockTimestamp, toTimestamp)
        )
      );

    // Fetch SP deposit snapshots for the period to calculate average
    const spSnapshots = await db
      .select()
      .from(spDepositSnapshots)
      .where(
        and(
          ...(branchId !== -1 ? [gte(spDepositSnapshots.branchId, branchId)] : []),
          gte(spDepositSnapshots.blockTimestamp, fromTimestamp),
          lte(spDepositSnapshots.blockTimestamp, toTimestamp)
        )
      );

    // Calculate sum of interest rewards
    const totalInterestRewardsBigInt = interestRewards.reduce((sum, reward) => {
      return sum + BigInt(reward.amount.toString());
    }, BigInt(0));

    // Calculate sum of (collSentToSP * price)
    const totalCollateralValueBigInt = liquidations.reduce((sum, liquidation) => {
      const collValue = BigInt(liquidation.collSentToSP.toString()) * BigInt(liquidation.price.toString());
      return sum + collValue;
    }, BigInt(0));

    // Calculate average total bold deposits
    let averageBoldDepositsBigInt = BigInt(0);
    if (spSnapshots.length > 0) {
      const totalBoldDeposits = spSnapshots.reduce((sum, snapshot) => {
        return sum + BigInt(Math.floor(Number(snapshot.totalBoldDeposits)) ?? '0');
      }, BigInt(0));
      averageBoldDepositsBigInt = totalBoldDeposits / BigInt(spSnapshots.length ?? 1);
    }

    // Calculate APY
    let apyBigInt = BigInt(0);
    if (averageBoldDepositsBigInt > BigInt(0)) {
      const numerator = totalInterestRewardsBigInt + totalCollateralValueBigInt;
      // Scale up to maintain precision in decimal calculation
      apyBigInt = (numerator * BigInt(10 ** 18)) / averageBoldDepositsBigInt;
    }

    return {
      branchId,
      totalInterestRewards: totalInterestRewardsBigInt.toString(),
      totalCollBalance: totalCollateralValueBigInt.toString(),
      totalBoldDepositAvg: averageBoldDepositsBigInt.toString(),
      apy: apyBigInt.toString(),
      periodStart: fromTimestamp,
      periodEnd: toTimestamp,
      dataPoints: {
        interestRewardsCount: interestRewards.length,
        liquidationLogsCount: liquidations.length,
        spDepositSnapshotsCount: spSnapshots.length,
      },
    };
  } catch (error) {
    console.error(`Error calculating APY for branch ${branchId}:`, error);
    throw error;
  }
}

/**
 * Calculate APY for multiple branches
 * 
 * @param branchIds - Array of branch IDs to calculate APY for
 * @param fromTimestamp - Start timestamp (inclusive)
 * @param toTimestamp - End timestamp (inclusive)
 * @returns Array of ApyCalculationResult for each branch
 */
export async function calculateApyForBranches(
  branchIds: number[],
  fromTimestamp: bigint,
  toTimestamp: bigint
): Promise<ApyCalculationResult[]> {
  const results: ApyCalculationResult[] = [];

  for (const branchId of branchIds) {
    const result = await calculateApyForBranch(branchId, fromTimestamp, toTimestamp);
    results.push(result);
  }

  return results;
}

/**
 * Convert APY from raw value (with 18 decimal places) to percentage
 * 
 * @param apyRaw - Raw APY value (scaled by 10^18)
 * @returns APY as a percentage string (e.g., "5.25" for 5.25%)
 */
export function formatApyAsPercentage(apyRaw: string): string {
  const apyBigInt = BigInt(apyRaw);
  const percentageBigInt = (apyBigInt * BigInt(100)) / BigInt(10 ** 18);
  const decimalPart = ((apyBigInt * BigInt(10000)) / BigInt(10 ** 18)) % BigInt(100);
  
  return `${percentageBigInt.toString()}.${decimalPart.toString().padStart(2, '0')}`;
}

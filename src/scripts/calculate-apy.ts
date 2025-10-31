#!/usr/bin/env node

import { calculateApyForBranch, formatApyAsPercentage } from '../lib/apy-calculator';
import { updateBranchStats } from '../db/queries';
import { getContracts } from '../lib/contracts';

/**
 * Script to calculate APY for each stability branch and update the database
 * Calculates: current APY, 1-day APY, and 7-day APY
 * 
 * Usage:
 *   bun run src/scripts/calculate-apy.ts
 */

// Time periods in seconds
const TIME_PERIODS = {
  ONE_DAY: 86400n,      // 24 hours
  SEVEN_DAYS: 604800n,  // 7 days
  ONE_YEAR: 31536000n,  // 365 days
};

async function calculateAndUpdateBranchApy() {
  console.log('📊 Calculating APY for all branches...');
  console.log('');

  const branches = getContracts().collaterals.map((collateral) => ({
    id: collateral.collIndex,
    name: collateral.symbol,
  }));

  try {
    const nowTimestamp = BigInt(Math.floor(Date.now() / 1000));

    for (const branch of branches) {
      console.log(`Calculating APY for ${branch.name} (Branch ID: ${branch.id})...`);

      // Calculate 1-day APY
      const oneDayAgo = nowTimestamp - TIME_PERIODS.ONE_DAY;
      const apyResult1d = await calculateApyForBranch(branch.id, oneDayAgo, nowTimestamp);
      const apy1dPercentage = formatApyAsPercentage(apyResult1d.apy);

      // Calculate 7-day APY
      const sevenDaysAgo = nowTimestamp - TIME_PERIODS.SEVEN_DAYS;
      const apyResult7d = await calculateApyForBranch(branch.id, sevenDaysAgo, nowTimestamp);
      const apy7dPercentage = formatApyAsPercentage(apyResult7d.apy);

      // Calculate 1-year APY
      const oneYearAgo = nowTimestamp - TIME_PERIODS.ONE_YEAR;
      const apyResult1y = await calculateApyForBranch(branch.id, oneYearAgo, nowTimestamp);
      const apy1yPercentage = formatApyAsPercentage(parseInt(formatApyAsPercentage(apyResult1y.apy)).toString());

      // Calculate current APY (using a recent period or you could use a longer period)
      // For now, using the same as 7-day as the "current" APY
      const apyResultCurrent = apyResult1y;
      const apyCurrentPercentage = apy1yPercentage

      console.log(`  ├─ 1-Day APY: ${apy1dPercentage}%`);
      console.log(`  │  └─ Interest Rewards: ${apyResult1d.dataPoints.interestRewardsCount}`);
      console.log(`  │  └─ Liquidations: ${apyResult1d.dataPoints.liquidationLogsCount}`);
      console.log(`  ├─ 7-Day APY: ${apy7dPercentage}%`);
      console.log(`  │  └─ Interest Rewards: ${apyResult7d.dataPoints.interestRewardsCount}`);
      console.log(`  │  └─ Liquidations: ${apyResult7d.dataPoints.liquidationLogsCount}`);
      console.log(`  ├─ 1-Year APY: ${apy1yPercentage}%`);
      console.log(`  │  └─ Interest Rewards: ${apyResult1y.dataPoints.interestRewardsCount}`);
      console.log(`  │  └─ Liquidations: ${apyResult1y.dataPoints.liquidationLogsCount}`);
      console.log(`  └─ Current APY (1-year avg): ${apyCurrentPercentage}%`);
      console.log('');

      // Update the branch stats in the database
      try {
        await updateBranchStats(branch, {
          sp_apy: parseInt(formatApyAsPercentage(apyResultCurrent.apy)).toString(),
          apy_avg: parseInt(formatApyAsPercentage(apyResultCurrent.apy)).toString(),
          sp_apy_avg_1d: apyResult1d.apy,
          sp_apy_avg_7d: apyResult7d.apy,
        });
        console.log(`  ✅ Updated ${branch.name} in database`);
      } catch (error) {
        console.error(`  ❌ Failed to update ${branch.name}:`, error);
      }

      console.log('');
    }

    // Summary
    console.log('✅ APY calculation and database update complete!');
    console.log('');
    console.log('Summary of updates:');
    console.log('  - sp_apy: Updated with current APY');
    console.log('  - sp_apy_avg_1d: Updated with 1-day average APY');
    console.log('  - sp_apy_avg_7d: Updated with 7-day average APY');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    console.error(error);
    process.exit(1);
  }
}

// Run the calculation
calculateAndUpdateBranchApy();

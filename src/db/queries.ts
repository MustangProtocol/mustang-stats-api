import { getDb } from './connection';
import { branchStats, stabilityPoolEvents, globalStats, prices } from './schema';
import { eq, desc, and } from 'drizzle-orm';

export interface BranchStats {
  coll_active: string;
  coll_default: string;
  coll_price: string;
  debt_recorded: string;
  debt_default: string;
  sp_deposits: string;
  interest_accrual_1y: string;
  interest_pending: string;
  batch_management_fees_pending: string;
  coll: string;
  coll_value: string;
  debt_pending: string;
  debt_active: string;
  debt: string;
  value_locked: string;
  interest_rate_avg: string;
  sp_apy: string;
  apy_avg: string;
  sp_apy_avg_1d: string;
  sp_apy_avg_7d: string;
}

export interface GlobalStats {
  total_bold_supply: string;
  total_debt_pending: string;
  total_coll_value: string;
  total_sp_deposits: string;
  total_value_locked: string;
  max_sp_apy: string;
  branch: Record<string, BranchStats>;
  prices: Record<string, string>;
}

/**
 * Update or insert branch statistics
 */
export async function updateBranchStats(branch: string, stats: Partial<BranchStats>) {
  const db = getDb();

  try {
    // Use upsert pattern: try update first, if no rows affected, insert
    const existingBranch = await db
      .select()
      .from(branchStats)
      .where(eq(branchStats.branchName, branch))
      .limit(1);

    if (existingBranch.length > 0) {
      // Update existing
      await db
        .update(branchStats)
        .set({
          collActive: stats.coll_active as any,
          collDefault: stats.coll_default as any,
          collPrice: stats.coll_price as any,
          debtRecorded: stats.debt_recorded as any,
          debtDefault: stats.debt_default as any,
          spDeposits: stats.sp_deposits as any,
          interestAccrual1y: stats.interest_accrual_1y as any,
          interestPending: stats.interest_pending as any,
          batchManagementFeesPending: stats.batch_management_fees_pending as any,
          debtPending: stats.debt_pending as any,
          debtActive: stats.debt_active as any,
          interestRateAvg: stats.interest_rate_avg as any,
          spApy: stats.sp_apy as any,
          apyAvg: stats.apy_avg as any,
          spApyAvg1d: stats.sp_apy_avg_1d as any,
          spApyAvg7d: stats.sp_apy_avg_7d as any,
          updatedAt: new Date(),
        })
        .where(eq(branchStats.branchName, branch));
    } else {
      // Insert new
      await db.insert(branchStats).values({
        branchName: branch,
        collActive: stats.coll_active as any,
        collDefault: stats.coll_default as any,
        collPrice: stats.coll_price as any,
        debtRecorded: stats.debt_recorded as any,
        debtDefault: stats.debt_default as any,
        spDeposits: stats.sp_deposits as any,
        interestAccrual1y: stats.interest_accrual_1y as any,
        interestPending: stats.interest_pending as any,
        batchManagementFeesPending: stats.batch_management_fees_pending as any,
        debtPending: stats.debt_pending as any,
        debtActive: stats.debt_active as any,
        interestRateAvg: stats.interest_rate_avg as any,
        spApy: stats.sp_apy as any,
        apyAvg: stats.apy_avg as any,
        spApyAvg1d: stats.sp_apy_avg_1d as any,
        spApyAvg7d: stats.sp_apy_avg_7d as any,
      });
    }

    console.log(`✅ Updated stats for ${branch}`);
  } catch (error) {
    console.error(`Error updating stats for ${branch}:`, error);
    throw error;
  }
}

/**
 * Update or insert global statistics
 */
export async function updateGlobalStats(stats: Partial<GlobalStats>) {
  const db = getDb();

  try {
    // Insert new global stats (we typically keep only the latest)
    await db.insert(globalStats).values({
      totalBoldSupply: stats.total_bold_supply as any,
      totalDebtPending: stats.total_debt_pending as any,
      totalCollValue: stats.total_coll_value as any,
      totalSpDeposits: stats.total_sp_deposits as any,
      totalValueLocked: stats.total_value_locked as any,
      maxSpApy: stats.max_sp_apy as any,
    });

    console.log('✅ Updated global stats');
  } catch (error) {
    console.error('Error updating global stats:', error);
    throw error;
  }
}

/**
 * Update or insert asset prices
 */
export async function updatePrices(priceData: Record<string, string>) {
  const db = getDb();

  try {
    for (const [symbol, price] of Object.entries(priceData)) {
      // Check if price exists
      const existing = await db
        .select()
        .from(prices)
        .where(eq(prices.symbol, symbol))
        .limit(1);

      if (existing.length > 0) {
        // Update
        await db
          .update(prices)
          .set({
            price: price as any,
            updatedAt: new Date(),
          })
          .where(eq(prices.symbol, symbol));
      } else {
        // Insert
        await db.insert(prices).values({
          symbol,
          price: price as any,
        });
      }
    }

    console.log('✅ Updated prices');
  } catch (error) {
    console.error('Error updating prices:', error);
    throw error;
  }
}

/**
 * Log a stability pool event
 */
export async function logEvent(
  branch: string,
  eventType: string,
  data: {
    amount?: string;
    oldValue?: string;
    newValue?: string;
    txHash?: string;
    blockNumber?: number;
    logIndex?: number;
    customData?: Record<string, unknown>;
  }
) {
  const db = getDb();

  try {
    await db.insert(stabilityPoolEvents).values({
      branchName: branch,
      eventType,
      amount: data.amount as any,
      oldValue: data.oldValue as any,
      newValue: data.newValue as any,
      transactionHash: data.txHash,
      blockNumber: data.blockNumber ? BigInt(data.blockNumber) : null,
      logIndex: data.logIndex,
      data: data.customData ? JSON.stringify(data.customData) : null,
    });

    console.log(`✅ Logged event: ${eventType} for ${branch}`);
  } catch (error) {
    console.error(`Error logging event for ${branch}:`, error);
    throw error;
  }
}

/**
 * Get latest statistics or historical records
 */
export async function getLatestStats(limitCount: number = 1): Promise<GlobalStats | GlobalStats[]> {
  const db = getDb();

  try {
    // Fetch global stats
    const globalStatsResult = await db
      .select()
      .from(globalStats)
      .orderBy(desc(globalStats.createdAt))
      .limit(limitCount);

    // Fetch all branch stats
    const branchStatsResult = await db.select().from(branchStats);

    // Fetch all prices
    const pricesResult = await db.select().from(prices);

    // Format response
    const branches: Record<string, BranchStats> = {};
    for (const branch of branchStatsResult) {
      const collValue = (
        BigInt(branch.collActive.toString()) * BigInt(branch.collPrice.toString())
      ).toString();

      const valueLockedBigInt =
        BigInt(branch.collActive.toString()) * BigInt(branch.collPrice.toString()) +
        BigInt(branch.debtActive.toString());

      branches[branch.branchName] = {
        coll_active: branch.collActive.toString(),
        coll_default: branch.collDefault.toString(),
        coll_price: branch.collPrice.toString(),
        debt_recorded: branch.debtRecorded.toString(),
        debt_default: branch.debtDefault.toString(),
        sp_deposits: branch.spDeposits.toString(),
        interest_accrual_1y: branch.interestAccrual1y.toString(),
        interest_pending: branch.interestPending.toString(),
        batch_management_fees_pending: branch.batchManagementFeesPending.toString(),
        coll: branch.collActive.toString(),
        coll_value: collValue,
        debt_pending: branch.debtPending.toString(),
        debt_active: branch.debtActive.toString(),
        debt: branch.debtActive.toString(),
        value_locked: valueLockedBigInt.toString(),
        interest_rate_avg: branch.interestRateAvg.toString(),
        sp_apy: branch.spApy.toString(),
        apy_avg: branch.apyAvg.toString(),
        sp_apy_avg_1d: branch.spApyAvg1d.toString(),
        sp_apy_avg_7d: branch.spApyAvg7d.toString(),
      };
    }

    const pricesMap: Record<string, string> = {};
    for (const p of pricesResult) {
      pricesMap[p.symbol] = p.price.toString();
    }

    if (limitCount === 1 && globalStatsResult.length > 0) {
      const stats = globalStatsResult[0];
      return {
        total_bold_supply: stats?.totalBoldSupply.toString(),
        total_debt_pending: stats?.totalDebtPending.toString(),
        total_coll_value: stats?.totalCollValue.toString(),
        total_sp_deposits: stats?.totalSpDeposits.toString(),
        total_value_locked: stats?.totalValueLocked.toString(),
        max_sp_apy: stats?.maxSpApy.toString(),
        branch: branches,
        prices: pricesMap,
      } as GlobalStats;
    } else {
      return globalStatsResult.map((stats) => ({
        total_bold_supply: stats.totalBoldSupply.toString(),
        total_debt_pending: stats.totalDebtPending.toString(),
        total_coll_value: stats.totalCollValue.toString(),
        total_sp_deposits: stats.totalSpDeposits.toString(),
        total_value_locked: stats.totalValueLocked.toString(),
        max_sp_apy: stats.maxSpApy.toString(),
        branch: branches,
        prices: pricesMap,
      })) as GlobalStats[];
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
}

/**
 * Get event logs with optional filtering
 */
export async function getEventLogs(
  branch?: string,
  eventType?: string,
  limitCount: number = 100
) {
  const db = getDb();

  try {
    // Build dynamic where conditions
    const conditions = [];
    if (branch) conditions.push(eq(stabilityPoolEvents.branchName, branch));
    if (eventType) conditions.push(eq(stabilityPoolEvents.eventType, eventType));
    
    if (conditions.length > 0) {
      return await db.select().from(stabilityPoolEvents).where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(stabilityPoolEvents.createdAt)).limit(limitCount);
    } else {
      return await db.select().from(stabilityPoolEvents).orderBy(desc(stabilityPoolEvents.createdAt)).limit(limitCount);
    }
  } catch (error) {
    console.error('Error fetching event logs:', error);
    throw error;
  }
}

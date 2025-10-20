import { getDb } from './connection';
import { branchStats, globalStats, prices } from './schema';
import { eq, desc } from 'drizzle-orm';

export interface BranchStats {
  branch_id: string;
  branch_name: string;
  sp_deposits: string;
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
export async function updateBranchStats(branch: { id: number, name: string }, stats: Partial<BranchStats>) {
  const db = getDb();

  try {
    // Use upsert pattern: try update first, if no rows affected, insert
    const existingBranch = await db
      .select()
      .from(branchStats)
      .where(eq(branchStats.branchId, branch.id))
      .limit(1);

    if (existingBranch.length > 0) {
      // Update existing - only update provided fields
      const updateData: any = { updatedAt: new Date() };
      
      if (stats.sp_deposits !== undefined) updateData.spDeposits = stats.sp_deposits;
      if (stats.sp_apy !== undefined) updateData.spApy = stats.sp_apy;
      if (stats.apy_avg !== undefined) updateData.apyAvg = stats.apy_avg;
      if (stats.sp_apy_avg_1d !== undefined) updateData.spApyAvg1d = stats.sp_apy_avg_1d;
      if (stats.sp_apy_avg_7d !== undefined) updateData.spApyAvg7d = stats.sp_apy_avg_7d;

      await db
        .update(branchStats)
        .set(updateData)
        .where(eq(branchStats.branchId, branch.id));
    } else {
      // Insert new - require sp_deposits for new records
      await db.insert(branchStats).values({
        branchId: branch.id,
        branchName: branch.name,
        spDeposits: stats.sp_deposits || '0',
        spApy: stats.sp_apy || '0',
        apyAvg: stats.apy_avg || '0',
        spApyAvg1d: stats.sp_apy_avg_1d || '0',
        spApyAvg7d: stats.sp_apy_avg_7d || '0',
      });
    }

    console.log(`✅ Updated stats for ${branch.name}`);
  } catch (error) {
    console.error(`Error updating stats for ${branch.name}:`, error);
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
      branches[branch.branchName] = {
        branch_id: branch.branchId.toString(),
        branch_name: branch.branchName,
        sp_deposits: branch.spDeposits.toString(),
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
import { pgTable, serial, varchar, numeric, timestamp, bigint, integer, jsonb, index, foreignKey } from 'drizzle-orm/pg-core';

/**
 * Branch Statistics Table
 * Stores the latest statistics for each collateral branch (WETH, wstETH, rETH)
 */
export const branchStats = pgTable(
  'branch_stats',
  {
    id: serial('id').primaryKey(),
    branchName: varchar('branch_name', { length: 50 }).notNull().unique(),
    collActive: numeric('coll_active', { precision: 50, scale: 18 }).notNull(),
    collDefault: numeric('coll_default', { precision: 50, scale: 18 }).notNull(),
    collPrice: numeric('coll_price', { precision: 50, scale: 8 }).notNull(),
    debtRecorded: numeric('debt_recorded', { precision: 50, scale: 18 }).notNull(),
    debtDefault: numeric('debt_default', { precision: 50, scale: 18 }).notNull(),
    spDeposits: numeric('sp_deposits', { precision: 50, scale: 18 }).notNull(),
    interestAccrual1y: numeric('interest_accrual_1y', { precision: 50, scale: 18 }).notNull(),
    interestPending: numeric('interest_pending', { precision: 50, scale: 18 }).notNull(),
    batchManagementFeesPending: numeric('batch_management_fees_pending', { precision: 50, scale: 18 }).notNull(),
    debtPending: numeric('debt_pending', { precision: 50, scale: 18 }).notNull(),
    debtActive: numeric('debt_active', { precision: 50, scale: 18 }).notNull(),
    interestRateAvg: numeric('interest_rate_avg', { precision: 20, scale: 18 }).notNull(),
    spApy: numeric('sp_apy', { precision: 20, scale: 18 }).notNull(),
    apyAvg: numeric('apy_avg', { precision: 20, scale: 18 }).notNull(),
    spApyAvg1d: numeric('sp_apy_avg_1d', { precision: 20, scale: 18 }).notNull(),
    spApyAvg7d: numeric('sp_apy_avg_7d', { precision: 20, scale: 18 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    branchNameIdx: index('idx_branch_stats_branch_name').on(table.branchName),
  })
);

/**
 * Stability Pool Events Table
 * Immutable log of all stability pool activities
 */
export const stabilityPoolEvents = pgTable(
  'stability_pool_events',
  {
    id: serial('id').primaryKey(),
    branchName: varchar('branch_name', { length: 50 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    amount: numeric('amount', { precision: 50, scale: 18 }),
    oldValue: numeric('old_value', { precision: 50, scale: 18 }),
    newValue: numeric('new_value', { precision: 50, scale: 18 }),
    transactionHash: varchar('transaction_hash', { length: 255 }),
    blockNumber: bigint('block_number', { mode: 'bigint' }),
    logIndex: integer('log_index'),
    data: jsonb('data'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    branchNameFk: foreignKey({
      columns: [table.branchName],
      foreignColumns: [branchStats.branchName],
    }),
    branchNameIdx: index('idx_sp_events_branch').on(table.branchName),
    createdAtIdx: index('idx_sp_events_created').on(table.createdAt),
  })
);

/**
 * Global Stats Table
 * Tracks global protocol statistics over time
 */
export const globalStats = pgTable(
  'global_stats',
  {
    id: serial('id').primaryKey(),
    totalBoldSupply: numeric('total_bold_supply', { precision: 50, scale: 18 }).notNull(),
    totalDebtPending: numeric('total_debt_pending', { precision: 50, scale: 18 }).notNull(),
    totalCollValue: numeric('total_coll_value', { precision: 50, scale: 18 }).notNull(),
    totalSpDeposits: numeric('total_sp_deposits', { precision: 50, scale: 18 }).notNull(),
    totalValueLocked: numeric('total_value_locked', { precision: 50, scale: 18 }).notNull(),
    maxSpApy: numeric('max_sp_apy', { precision: 20, scale: 18 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  }
);

/**
 * Prices Table
 * Asset price reference data
 */
export const prices = pgTable(
  'prices',
  {
    id: serial('id').primaryKey(),
    symbol: varchar('symbol', { length: 50 }).notNull().unique(),
    price: numeric('price', { precision: 50, scale: 8 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    symbolIdx: index('idx_prices_symbol').on(table.symbol),
  })
);

/**
 * Event Query State Table
 * Tracks the state of blockchain event queries (last queried block, etc.)
 */
export const eventQueryState = pgTable(
  'event_query_state',
  {
    id: serial('id').primaryKey(),
    eventType: varchar('event_type', { length: 100 }).notNull().unique(),
    lastQueriedFromBlock: varchar('last_queried_from_block', { length: 50 }).notNull(),
    lastQueriedToBlock: varchar('last_queried_to_block', { length: 50 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  }
);

/**
 * SP Deposit Events Table
 * Stores stability pool deposit updated events from blockchain
 */
export const spDepositEvents = pgTable(
  'sp_deposit_events',
  {
    id: serial('id').primaryKey(),
    depositor: varchar('depositor', { length: 255 }).notNull(),
    depositAmount: numeric('deposit_amount', { precision: 50, scale: 18 }).notNull(),
    stashedColl: numeric('stashed_coll', { precision: 50, scale: 18 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
    blockTimestamp: bigint('block_timestamp', { mode: 'bigint' }).notNull(),
    transactionHash: varchar('transaction_hash', { length: 255 }).notNull(),
    branchId: integer('branch_id').notNull(),
    spAddress: varchar('sp_address', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    depositorIdx: index('idx_sp_deposit_depositor').on(table.depositor),
    blockNumberIdx: index('idx_sp_deposit_block').on(table.blockNumber),
    branchIdIdx: index('idx_sp_deposit_branch').on(table.branchId),
    txHashIdx: index('idx_sp_deposit_tx_hash').on(table.transactionHash),
    createdAtIdx: index('idx_sp_deposit_created').on(table.createdAt),
  })
);

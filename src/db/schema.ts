import { pgTable, serial, varchar, numeric, timestamp, bigint, integer, jsonb, index, foreignKey } from 'drizzle-orm/pg-core';

/**
 * Branch Statistics Table
 * Stores the latest statistics for each collateral branch (WETH, wstETH, rETH)
 */
export const branchStats = pgTable(
  'branch_stats',
  {
    id: serial('id').primaryKey(),
    branchId: integer('branch_id').notNull().unique(),
    branchName: varchar('branch_name', { length: 50 }).notNull().unique(),
    spDeposits: numeric('sp_deposits', { precision: 50, scale: 18 }).notNull(),
    spApy: numeric('sp_apy', { precision: 20, scale: 18 }).notNull(),
    apyAvg: numeric('apy_avg', { precision: 20, scale: 18 }).notNull(),
    spApyAvg1d: numeric('sp_apy_avg_1d', { precision: 20, scale: 18 }).notNull(),
    spApyAvg7d: numeric('sp_apy_avg_7d', { precision: 20, scale: 18 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  }
);

export const spDepositSnapshots = pgTable('sp_deposit_snapshots',
  {
    id: serial('id').primaryKey(),
    branchId: integer('branch_id').notNull(),
    stabilityPool: varchar('stability_pool', { length: 255 }).notNull(),
    totalBoldDeposits: numeric('total_bold_deposits', { precision: 50, scale: 18 }).notNull(),
    totalCollBalance: numeric('total_coll_balance', { precision: 50, scale: 18 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
    blockTimestamp: bigint('block_timestamp', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  }
);

/**
 * ERC20 Transfer Logs Table
 * Stores ERC20 transfer events from blockchain
 */
export const interestRewardsLogs = pgTable('interest_rewards',
  {
    id: serial('id').primaryKey(),
    branchId: integer('branch_id').notNull(),
    stabilityPool: varchar('stability_pool', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 50, scale: 18 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
    blockTimestamp: bigint('block_timestamp', { mode: 'bigint' }).notNull(),
    transactionHash: varchar('transaction_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  }
);

/**
 * Liquidation Logs Table
 * Stores liquidation events from blockchain
 */
export const liquidationLogs = pgTable('liquidation_logs',
  {
    id: serial('id').primaryKey(),
    debtOffsetBySP: numeric('debt_offset_by_sp', { precision: 50, scale: 18 }).notNull(),
    debtRedistributed: numeric('debt_redistributed', { precision: 50, scale: 18 }).notNull(),
    boldGasCompensation: numeric('bold_gas_compensation', { precision: 50, scale: 18 }).notNull(),
    collGasCompensation: numeric('coll_gas_compensation', { precision: 50, scale: 18 }).notNull(),
    collSentToSP: numeric('coll_sent_to_sp', { precision: 50, scale: 18 }).notNull(),
    collRedistributed: numeric('coll_redistributed', { precision: 50, scale: 18 }).notNull(),
    collSurplus: numeric('coll_surplus', { precision: 50, scale: 18 }).notNull(),
    L_ETH: numeric('l_eth', { precision: 50, scale: 18 }).notNull(),
    L_boldDebt: numeric('l_bold_debt', { precision: 50, scale: 18 }).notNull(),
    price: numeric('price', { precision: 50, scale: 18 }).notNull(),
    blockNumber: bigint('block_number', { mode: 'bigint' }).notNull(),
    blockTimestamp: bigint('block_timestamp', { mode: 'bigint' }).notNull(),
    transactionHash: varchar('transaction_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
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
  }
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
  }
);


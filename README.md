# Mustang Stats API

A lightweight indexer and API for Mustang Finance stability pools and statistics.

## Features

- Built with [Bun](https://bun.com) for fast performance
- Express.js server framework
- PostgreSQL with Drizzle ORM for type-safe database operations
- RESTful API endpoints matching Liquity format
- Event logging for stability pool activities
- Support for multiple collateral branches (WETH, wstETH, rETH)
- Track APY, 7-day APY, and deposits across all branches

## Prerequisites

- Bun runtime (>=1.0)
- PostgreSQL (>=12)

## Local Development Setup

Follow these steps to set up the project for local development:

```bash
# 1. Install dependencies
bun install

# 2. Generate Drizzle migrations
bun run db:generate

# 3. Run the setup script (creates database, applies migrations, seeds data)
bash setup.sh

# 4. Query stability pool data from blockchain
bun run src/scripts/query-stability-pools.ts

# 5. Calculate APY metrics
bun run src/scripts/calculate-apy.ts

# 6. Start the server
bun start
```

The server will be available at: http://localhost:3000/v2/saga.json

### Environment Variables

Create a `.env` file in the root directory:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mustang_stats
PORT=3000
```
Copy and paste the `.env.example` file into `.env`

## Running the Server

### Development Mode (with auto-reload)

```bash
bun run dev
```

### Production Mode

```bash
bun run start
```

The server will start on `http://localhost:3000` (or the port specified in the `PORT` environment variable).

### Updating Stats

To refresh stability pool data and recalculate APY:

```bash
# Query latest blockchain events and balances
bun run src/scripts/query-stability-pools.ts

# Recalculate APY metrics
bun run src/scripts/calculate-apy.ts
```

## API Endpoints

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-17T12:34:56.789Z"
}
```

### GET `/v2/saga.json`

Returns the latest stability pool statistics in Liquity API format.

**Response:** Complete stats object with branches and prices (see below)

### GET `/v2/saga/history?limit=10`

Returns historical statistics. Query parameter `limit` specifies how many records to return (default: 10).

### GET `/events/sp-deposits`

Returns stability pool deposit events with optional filters.

**Query Parameters:**
- `limit` - Number of events to return (default: 100)
- `offset` - Pagination offset (default: 0)
- `depositor` - Filter by depositor address
- `fromTimestamp` - Filter events after this timestamp
- `toTimestamp` - Filter events before this timestamp

### GET `/events/sp-deposits/branch/:branchId`

Returns stability pool deposit events for a specific branch.

**Parameters:**
- `branchId` - Branch ID (0 for WETH, 1 for wstETH, 2 for rETH)

**Query Parameters:**
- `limit` - Number of events to return (default: 100)

## Database

### Database Commands

```bash
# Generate migrations from schema changes
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema directly (good for development)
bun run db:push

# Open Drizzle Studio (visual database explorer)
bun run db:studio

# Seed database with sample data
bun run db:seed
```

### Query Examples

```typescript
import { getDb } from './db/connection';
import { branchStats } from './db/schema';
import { eq, desc } from 'drizzle-orm';

const db = getDb();

// Select
const weth = await db
  .select()
  .from(branchStats)
  .where(eq(branchStats.branchName, 'WETH'));

// Insert
await db.insert(branchStats).values({
  branchName: 'WETH',
  collActive: '6577.728',
  // ... other fields
});

// Update
await db
  .update(branchStats)
  .set({ spApy: '0.05' })
  .where(eq(branchStats.branchName, 'WETH'));
```

## Project Structure

```
src/
├── index.ts              # Main server & routes
└── db/
    ├── schema.ts        # Drizzle table definitions
    ├── connection.ts    # Database connection
    ├── queries.ts       # Query functions
    └── seed.ts          # Initial data seeding

drizzle/                # Generated migrations
drizzle.config.ts       # Drizzle configuration
```

## Example Response Format

```json
{
  "total_bold_supply": "47195418.776805870329101699",
  "total_debt_pending": "67.678100538693426982",
  "total_coll_value": "144800856.109506122883841247",
  "total_sp_deposits": "36603007.748120391332780074",
  "total_value_locked": "181403863.857626514216621321",
  "max_sp_apy": "0.04610593992950242",
  "branch": {
    "WETH": {
      "coll_active": "6577.728311520836877562",
      "coll_default": "0",
      "coll_price": "3826.25",
      "debt_recorded": "12127344.321243159179124336",
      "debt_default": "0",
      "sp_deposits": "9425337.28387769584171724",
      "interest_accrual_1y": "375694.433899158579944924",
      "interest_pending": "5.003540786328215487",
      "batch_management_fees_pending": "12.135807959020457686",
      "coll": "6577.728311520836877562",
      "coll_value": "25168032.951956602102771602",
      "debt_pending": "17.139348745348673173",
      "debt_active": "12127361.460591904527797509",
      "debt": "12127361.460591904527797509",
      "value_locked": "34593370.235834297944488842",
      "interest_rate_avg": "0.03097907447716347",
      "sp_apy": "0.029895038971851526",
      "apy_avg": "0.029895038971851526",
      "sp_apy_avg_1d": "0.04721625355705536",
      "sp_apy_avg_7d": "0.07671293678371476"
    },
    "wstETH": { /* ... */ },
    "rETH": { /* ... */ }
  },
  "prices": {
    "ETH": "3822.19",
    "LQTY": "0.50493",
    "BOLD": "1.002",
    /* ... */
  }
}
```

## Scripts

### Server Scripts
```bash
# Development with hot reload
bun run dev

# Production
bun run start
```

### Database Scripts
```bash
# Generate migrations from schema
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema directly (dev only)
bun run db:push

# Visual database explorer
bun run db:studio

# Seed sample data
bun run db:seed
```

### Data Scripts
```bash
# Query stability pool events from blockchain
bun run src/scripts/query-stability-pools.ts

# Calculate APY metrics
bun run src/scripts/calculate-apy.ts
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (required)
- `CHAIN_RPC_URL` - RPC provider endpoint

## License

MIT

---

Learn more about Mustang Protocol at [must.finance](https://must.finance)

import { getDb, closeDb } from '@/src/db/connection';
import { interestRewardsLogs } from '@/src/db/schema';
import { getPublicClient } from '@/src/utils/client';
import { isNull, or, eq } from 'drizzle-orm';

async function updateBlockTimestamps() {
  try {
    console.log('🔍 Starting block timestamp update script...');
    
    const db = getDb();
    const publicClient = getPublicClient();
    
    // Query for interest reward events with missing or empty block timestamps
    const eventsWithMissingTimestamps = await db
      .select()
      .from(interestRewardsLogs)
      .where(
        or(
          isNull(interestRewardsLogs.blockTimestamp),
          eq(interestRewardsLogs.blockTimestamp, 0n)
        )
      );

    console.log(`📊 Found ${eventsWithMissingTimestamps.length} events with missing block timestamps`);

    if (eventsWithMissingTimestamps.length === 0) {
      console.log('✅ No events to update');
      await closeDb();
      return;
    }

    // Process each event
    let successCount = 0;
    let errorCount = 0;

    for (const event of eventsWithMissingTimestamps) {
      try {
        console.log(`⏳ Processing event ID: ${event.id}, Block: ${event.blockNumber}`);

        // Fetch block information from the RPC
        const block = await publicClient.getBlock({
          blockNumber: BigInt(event.blockNumber),
        });

        // Update the event with the block timestamp
        await db
          .update(interestRewardsLogs)
          .set({ blockTimestamp: BigInt(block.timestamp) })
          .where(eq(interestRewardsLogs.id, event.id));

        console.log(`✅ Updated event ID: ${event.id} with timestamp: ${block.timestamp}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error processing event ID: ${event.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📈 Update Summary:`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ❌ Failed updates: ${errorCount}`);
    console.log(`   📊 Total processed: ${successCount + errorCount}`);

    await closeDb();
    console.log('✨ Block timestamp update script completed!');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    await closeDb();
    process.exit(1);
  }
}

// Run the script
updateBlockTimestamps();

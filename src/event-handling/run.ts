import { queryAndLogStabilityPoolDepositUpdatedEvents } from './query-sp-deposits';

async function main() {
  try {
    console.log('Starting event processing...');
    
    const spDepositLogs = await queryAndLogStabilityPoolDepositUpdatedEvents();
    console.log(`Processed ${spDepositLogs.logs.length} stability pool deposit events`);
    
    if (spDepositLogs.logs.length > 0) {
      console.log('Sample events:', spDepositLogs.logs.slice(0, 2));
    }
  } catch (error) {
    console.error('Error during event processing:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('Event processing complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
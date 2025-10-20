import {
  queryAndSaveStabilityPoolTotalDepositsAndCollBalancesToDatabase
} from "../event-handling/query-sp-deposits";
import {
  queryAndLogStabilityPoolInterestRewardMintedEvents,
  queryAndLogStabilityPoolLiquidationRewardMintedEvents,
} from "../event-handling/query-sp-rewards";

async function main() {
  try {
    console.log('Starting stability pool query...');
    console.log('');

    console.log('Querying stability pool interest reward minted events...');
    await queryAndLogStabilityPoolInterestRewardMintedEvents();
    console.log('Querying stability pool liquidation reward minted events...');
    await queryAndLogStabilityPoolLiquidationRewardMintedEvents();
    console.log('Saving stability pool total deposits and collateral balances to database...');
    await queryAndSaveStabilityPoolTotalDepositsAndCollBalancesToDatabase();
    console.log('Stability pool query complete');
  } catch (error) {
    console.error('Error during stability pool query:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
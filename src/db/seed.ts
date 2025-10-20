import { updateGlobalStats, updateBranchStats, updatePrices } from './queries';

// Sample data from Liquity API
const sampleData = {
  total_bold_supply: '47195418.776805870329101699',
  total_debt_pending: '67.678100538693426982',
  total_coll_value: '144800856.109506122883841247',
  total_sp_deposits: '36603007.748120391332780074',
  total_value_locked: '181403863.857626514216621321',
  max_sp_apy: '0.04610593992950242',
  branch: {
    WETH: {
      branch_id: 0,
      sp_deposits: '9425337.28387769584171724',
      sp_apy: '0.029895038971851526',
      apy_avg: '0.029895038971851526',
      sp_apy_avg_1d: '0.04721625355705536',
      sp_apy_avg_7d: '0.07671293678371476',
    },
    wstETH: {
      branch_id: 1,
      sp_deposits: '23033860.299948901205448804',
      sp_apy: '0.046105939929502416',
      apy_avg: '0.046105939929502416',
      sp_apy_avg_1d: '0.049868406726385664',
      sp_apy_avg_7d: '0.4878191623841478',
    },
    rETH: {
      branch_id: 2,
      sp_deposits: '4143810.16429379428561403',
      sp_apy: '0.045673313130721135',
      apy_avg: '0.045673313130721135',
      sp_apy_avg_1d: '0.04576235597410636',
      sp_apy_avg_7d: '0.04822529596254936',
    },
  },
  prices: {
    ETH: '3822.19',
    LQTY: '0.50493',
    LEGACY_BOLD: '1',
    BOLD: '1.002',
    LUSD: '1',
    RETH: '4375.4',
    SDEX: '0.00359938',
    WSTETH: '4649.86',
  },
};

async function seedDatabase() {
  console.log('🌱 Seeding database with initial data...');

  try {
    // Update global stats
    await updateGlobalStats({
      total_bold_supply: sampleData.total_bold_supply,
      total_debt_pending: sampleData.total_debt_pending,
      total_coll_value: sampleData.total_coll_value,
      total_sp_deposits: sampleData.total_sp_deposits,
      total_value_locked: sampleData.total_value_locked,
      max_sp_apy: sampleData.max_sp_apy,
    } as any);
    console.log('✅ Global stats inserted');

    // Update branch stats for each collateral
    for (const [branchName, stats] of Object.entries(sampleData.branch)) {
      const branchId = (stats as any).branch_id;
      await updateBranchStats(branchId, branchName, {
        sp_deposits: (stats as any).sp_deposits,
        sp_apy: (stats as any).sp_apy,
        apy_avg: (stats as any).apy_avg,
        sp_apy_avg_1d: (stats as any).sp_apy_avg_1d,
        sp_apy_avg_7d: (stats as any).sp_apy_avg_7d,
      });
      console.log(`✅ ${branchName} branch stats inserted`);
    }

    // Update prices
    await updatePrices(sampleData.prices);
    console.log('✅ Prices inserted');

    console.log('✅ Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();

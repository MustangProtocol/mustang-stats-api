import { updateGlobalStats, updateBranchStats, updatePrices, logEvent } from './queries';

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
      coll_active: '6577.728311520836877562',
      coll_default: '0',
      coll_price: '3826.25',
      debt_recorded: '12127344.321243159179124336',
      debt_default: '0',
      sp_deposits: '9425337.28387769584171724',
      interest_accrual_1y: '375694.433899158579944924',
      interest_pending: '5.003540786328215487',
      batch_management_fees_pending: '12.135807959020457686',
      debt_pending: '17.139348745348673173',
      debt_active: '12127361.460591904527797509',
      interest_rate_avg: '0.03097907447716347',
      sp_apy: '0.029895038971851526',
      apy_avg: '0.029895038971851526',
      sp_apy_avg_1d: '0.04721625355705536',
      sp_apy_avg_7d: '0.07671293678371476',
    },
    wstETH: {
      coll_active: '22209.377443089903020673',
      coll_default: '0',
      coll_price: '4625.604321169860928063',
      debt_recorded: '30400002.975056089357256065',
      debt_default: '0',
      sp_deposits: '23033860.299948901205448804',
      interest_accrual_1y: '1415997.039111992737518864',
      interest_pending: '18.858408055144499929',
      batch_management_fees_pending: '11.23678106891296079',
      debt_pending: '30.095189124057460719',
      debt_active: '30400033.070245213414716784',
      interest_rate_avg: '0.046578799300647306',
      sp_apy: '0.046105939929502416',
      apy_avg: '0.046105939929502416',
      sp_apy_avg_1d: '0.049868406726385664',
      sp_apy_avg_7d: '0.4878191623841478',
    },
    rETH: {
      coll_active: '3861.486064901388351802',
      coll_default: '0',
      coll_price: '4376.82037491232893625',
      debt_recorded: '4668071.480506621792721298',
      debt_default: '0',
      sp_deposits: '4143810.16429379428561403',
      interest_accrual_1y: '252348.718917407278733967',
      interest_pending: '3.360808661380994961',
      batch_management_fees_pending: '17.082754007906298129',
      debt_pending: '20.44356266928729309',
      debt_active: '4668091.924069291080014388',
      interest_rate_avg: '0.054058215438360233',
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
      await updateBranchStats(branchName, stats as any);
      console.log(`✅ ${branchName} branch stats inserted`);

      // Log an initial sync event
      await logEvent(branchName, 'STATS_SYNC', {
        customData: {
          source: 'liquity-api',
          syncType: 'initial',
        },
      });
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

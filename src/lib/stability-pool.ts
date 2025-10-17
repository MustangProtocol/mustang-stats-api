import { getAddress, type Address } from 'viem';
import { getSPDepositEvents } from '@/src/event-handling/db';
import type { CollIndex } from '../types';

export interface StabilityPoolDeposit {
  address: Address;
  deposits: {
    collIndex: CollIndex;
    amount: bigint;
  }[];
}

export async function getStabilityPoolDeposits(): Promise<StabilityPoolDeposit[]> {
  try {
    // Get all SP deposit events from database
    const events = await getSPDepositEvents({
      limit: 100000, // Get all events
      offset: 0,
    });

    // Group deposits by depositor and branch
    const deposits: Record<Address, Record<CollIndex, bigint>> = events.reduce(
      (acc, event) => {
        const depositorAddress = getAddress(event.depositor);
        if (!acc[depositorAddress]) {
          acc[depositorAddress] = {
            0: 0n,
            1: 0n,
            2: 0n,
            3: 0n,
          };
        }
        // Use the latest deposit amount for each branch
        acc[depositorAddress][event.branchId as CollIndex] = BigInt(event.depositAmount);
        return acc;
      },
      {} as Record<Address, Record<CollIndex, bigint>>
    );

    // Format output
    return Object.entries(deposits)
      .map(([depositor, branchDeposits]) => ({
        address: getAddress(depositor),
        deposits: Object.entries(branchDeposits)
          .map(([collIndex, amount]) => ({
            collIndex: Number(collIndex) as CollIndex,
            amount,
          }))
          .filter(deposit => deposit.amount > 0n),
      }))
      .filter(spd => spd.deposits.length > 0);
  } catch (error) {
    console.error('Error fetching stability pool deposits:', error);
    throw error;
  }
}
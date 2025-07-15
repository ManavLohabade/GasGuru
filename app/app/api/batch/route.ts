import { NextRequest, NextResponse } from 'next/server';
import BatchingService from '../../../lib/batching-service';
import { initializeDatabase } from '../../../lib/database';

// Initialize database on first request
let dbInitialized = false;

const initDB = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
};

// POST /api/batch - Add transaction to batch
export async function POST(request: NextRequest) {
  await initDB();
  
  try {
    const body = await request.json();
    const { userAddress, toAddress, amount, tokenAddress, scheduledFor } = body;

    // Validate required fields
    if (!userAddress || !toAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, toAddress, amount' },
        { status: 400 }
      );
    }

    // Validate Ethereum addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userAddress) || !addressRegex.test(toAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Validate amount (should be a valid number)
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount value' },
        { status: 400 }
      );
    }

    const batchingService = new BatchingService();
    const scheduledDate = scheduledFor ? new Date(scheduledFor) : undefined;
    
    const batchId = await batchingService.addToBatch(
      userAddress,
      toAddress,
      amount,
      tokenAddress,
      scheduledDate
    );

    return NextResponse.json({
      success: true,
      batchId,
      message: 'Transaction added to batch successfully',
    });

  } catch (error) {
    console.error('Error adding transaction to batch:', error);
    return NextResponse.json(
      { error: 'Failed to add transaction to batch' },
      { status: 500 }
    );
  }
}

// GET /api/batch?batchId=xxx - Get transaction status
export async function GET(request: NextRequest) {
  await initDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Missing batchId parameter' },
        { status: 400 }
      );
    }

    const batchingService = new BatchingService();
    const transaction = await batchingService.getTransactionStatus(batchId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Convert BigInt to string for JSON serialization
    const responseTransaction = {
      ...transaction,
      gasEstimate: transaction.gasEstimate?.toString(),
    };

    return NextResponse.json({
      success: true,
      transaction: responseTransaction,
    });

  } catch (error) {
    console.error('Error fetching transaction status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction status' },
      { status: 500 }
    );
  }
} 
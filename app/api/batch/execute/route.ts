import { NextRequest, NextResponse } from 'next/server';
import BatchingService from '../../../../lib/batching-service';
import walletService from '../../../../lib/wallet-service';

// POST /api/batch/execute - Execute a batch transaction immediately
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: 'Missing batchId parameter' },
        { status: 400 }
      );
    }

    // Check if wallet is connected
    const isConnected = await walletService.isConnected();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Wallet not connected. Please connect your wallet first.' },
        { status: 400 }
      );
    }

    const batchingService = new BatchingService();
    
    // Execute the transaction immediately using wallet
    const result = await batchingService.executeImmediateTransaction(batchId, walletService);

    if (result.success) {
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        gasUsed: result.gasUsed?.toString(),
        message: 'Transaction executed successfully',
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Transaction execution failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error executing transaction:', error);
    return NextResponse.json(
      { error: 'Failed to execute transaction' },
      { status: 500 }
    );
  }
} 
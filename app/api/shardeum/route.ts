import { NextRequest, NextResponse } from 'next/server';
import ShardeumAPI from '../../lib/shardeum';

// GET /api/shardeum - Get Shardeum network information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'network-health';

    const shardeumAPI = new ShardeumAPI();

    switch (action) {
      case 'network-health':
        const networkHealth = await shardeumAPI.getNetworkHealth();
        return NextResponse.json({
          success: true,
          data: networkHealth,
        });

      case 'gas-price':
        const gasOptimization = await shardeumAPI.calculateOptimalGasPrice();
        return NextResponse.json({
          success: true,
          data: gasOptimization,
        });

      case 'node-list':
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const nodeList = await shardeumAPI.getNodeList(page, limit);
        return NextResponse.json({
          success: true,
          data: nodeList,
        });

      case 'cycle-info':
        const cycleNumber = searchParams.get('cycleNumber');
        const cycleInfo = await shardeumAPI.getCycleInfo(
          cycleNumber ? parseInt(cycleNumber) : undefined
        );
        return NextResponse.json({
          success: true,
          data: cycleInfo,
        });

      case 'chain-info':
        const [chainId, blockNumber, gasPrice] = await Promise.all([
          shardeumAPI.getChainId(),
          shardeumAPI.getBlockNumber(),
          shardeumAPI.getGasPrice(),
        ]);
        return NextResponse.json({
          success: true,
          data: {
            chainId,
            blockNumber,
            gasPrice,
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error fetching Shardeum data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Shardeum network data' },
      { status: 500 }
    );
  }
}

// POST /api/shardeum - Estimate gas for batch transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Invalid transactions array' },
        { status: 400 }
      );
    }

    const shardeumAPI = new ShardeumAPI();
    const batchSavings = await shardeumAPI.estimateBatchGasSavings(transactions);

    return NextResponse.json({
      success: true,
      data: batchSavings,
    });

  } catch (error) {
    console.error('Error estimating batch gas savings:', error);
    return NextResponse.json(
      { error: 'Failed to estimate gas savings' },
      { status: 500 }
    );
  }
} 
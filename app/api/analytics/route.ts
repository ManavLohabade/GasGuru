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

// GET /api/analytics?dappId=xxx - Get analytics for a dApp
// GET /api/analytics - Get global analytics
export async function GET(request: NextRequest) {
  await initDB();
  
  try {
    const { searchParams } = new URL(request.url);
    const dappId = searchParams.get('dappId');

    const batchingService = new BatchingService();

    if (dappId) {
      // Get analytics for specific dApp
      const analytics = await batchingService.getAnalytics(dappId);

      if (!analytics) {
        // Return empty analytics if no data found
        return NextResponse.json({
          success: true,
          analytics: {
            totalGasSaved: '0',
            totalBatches: 0,
            totalTransactions: 0,
            averageBatchSize: 0,
            lastUpdated: null,
          },
        });
      }

      // Convert BigInt to string for JSON serialization
      const responseAnalytics = {
        ...analytics,
        totalGasSaved: analytics.totalGasSaved.toString(),
      };

      return NextResponse.json({
        success: true,
        analytics: responseAnalytics,
      });
    } else {
      // Get global analytics across all dApps
      const globalAnalytics = await batchingService.getGlobalAnalytics();

      return NextResponse.json({
        success: true,
        analytics: globalAnalytics,
      });
    }

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 
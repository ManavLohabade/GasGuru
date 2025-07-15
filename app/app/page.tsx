import Link from 'next/link';
import { Activity, Zap, Clock, BarChart3, TrendingUp, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">GasGuru</h1>
            </div>
            <nav className="flex space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600 font-medium">
                Dashboard
              </Link>
              <Link href="/batch" className="text-gray-600 hover:text-indigo-600 font-medium">
                Batch Transactions
              </Link>
              <Link href="/analytics" className="text-gray-600 hover:text-indigo-600 font-medium">
                Analytics
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Optimize Gas Usage on <span className="text-indigo-600">Shardeum</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            GasGuru is the first transaction batching and scheduling protocol for Shardeum, 
            helping developers optimize gas usage for microtransaction-heavy dApps.
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/dashboard"
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
            <Link 
              href="/analytics"
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold border border-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              View Analytics
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <Activity className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Transaction Batching</h3>
            </div>
            <p className="text-gray-600">
              Combine multiple microtransactions into single batches to reduce gas costs by up to 70%.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <Clock className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Scheduled Execution</h3>
            </div>
            <p className="text-gray-600">
              Schedule transactions for optimal times with daily, weekly, or custom intervals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Gas Analytics</h3>
            </div>
            <p className="text-gray-600">
              Monitor gas savings, batch performance, and optimize your dApp's transaction strategy.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Platform Statistics
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">30%</div>
              <div className="text-gray-600">Average Gas Savings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">1.2M+</div>
              <div className="text-gray-600">Transactions Batched</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Active dApps</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
          </div>
        </div>

        {/* Why Shardeum Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-16">
          <div className="flex items-center mb-6">
            <Shield className="h-10 w-10 mr-4" />
            <h3 className="text-3xl font-bold">Built for Shardeum</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-semibold mb-3">Ultra-Low Fees</h4>
              <p className="text-indigo-100">
                Leverage Shardeum's predictable gas pricing to optimize microtransaction costs even further.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-3">Linear Scalability</h4>
              <p className="text-indigo-100">
                Scale your batching operations as Shardeum grows, maintaining efficiency at any size.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-3">EVM Compatible</h4>
              <p className="text-indigo-100">
                Seamlessly integrate with existing Ethereum tools and workflows on Shardeum.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-3">Real-time Monitoring</h4>
              <p className="text-indigo-100">
                Monitor network health and optimize gas usage with live Shardeum network data.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Optimize Your Gas Usage?
          </h3>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join hundreds of developers already saving on gas costs with GasGuru's intelligent batching system.
          </p>
          <Link 
            href="/dashboard"
            className="bg-indigo-600 text-white px-12 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Start Optimizing Now
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="h-6 w-6 text-indigo-400" />
                <span className="text-xl font-bold">GasGuru</span>
              </div>
              <p className="text-gray-400">
                The ultimate transaction optimization platform for Shardeum developers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/batch" className="hover:text-white">Batch Transactions</Link></li>
                <li><Link href="/analytics" className="hover:text-white">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Gas Optimization</li>
                <li>Scheduled Execution</li>
                <li>Real-time Monitoring</li>
                <li>Developer SDK</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Network</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Shardeum Mainnet</li>
                <li>Testnet Support</li>
                <li>API Documentation</li>
                <li>Network Status</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 GasGuru. Optimizing transactions on Shardeum.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

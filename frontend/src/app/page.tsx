'use client';
import ApiDebugger from './components/ApiDebugger';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="container mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-6">Full-Stack Comment Application</h1>
          <p className="text-lg mb-6">A real-time comment system with nested replies, user authentication, and notifications.</p>
        </div>
        
        <div className="flex justify-center space-x-4 mb-8">
          <Link href="/login" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md">
            Sign In
          </Link>
          <Link href="/register" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md">
            Create Account
          </Link>
          <Link href="/comments" className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-md">
            View Comments
          </Link>
        </div>

        <div className="my-8">
          <h2 className="text-2xl font-bold mb-4">API Connection Tester</h2>
          <p className="mb-4">Use the tool below to test your API connections and debug authentication issues:</p>
          <ApiDebugger />
        </div>
      </div>
    </main>
  );
}

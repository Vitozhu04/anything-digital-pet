export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-8">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-4xl font-bold">Anything Digital Pet</h1>
        <p className="text-gray-400">Give any project or URL a soul.</p>
        <div className="bg-gray-900 rounded-xl p-6 text-left text-sm space-y-2 font-mono">
          <p className="text-green-400"># In your project:</p>
          <p className="text-white">/create-pet:cli</p>
          <p className="text-gray-500 font-sans">Generate a pet from current project</p>
          <br />
          <p className="text-white">/create-pet:link https://github.com/...</p>
          <p className="text-gray-500 font-sans">Generate a pet from a URL</p>
          <br />
          <p className="text-white">/pet</p>
          <p className="text-gray-500 font-sans">Summon your pet for a chat</p>
        </div>
        <p className="text-gray-600 text-xs">Server running on port 3002</p>
      </div>
    </main>
  );
}

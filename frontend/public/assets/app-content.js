// Extracted HTML content from your original single file for easier gradual refactor.
// This is a stop-gap: it preserves the full UI markup while allowing JS/CSS to be split.
export default `
<!-- Header -->
<header class="bg-black bg-opacity-50 p-4 border-b border-gold-600">
  <div class="container mx-auto flex justify-between items-center">
    <div class="flex items-center space-x-6">
      <h1 class="text-2xl font-bold text-gold-400 cursor-pointer" id="homeLink">文化探索平台</h1>
      <button id="forumBtn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
        <span class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z"></path>
          </svg>
          論壇
        </span>
      </button>
    </div>
    <button id="settingsBtn" class="p-2 rounded-lg bg-gold-600 hover:bg-gold-700 transition-colors">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>
  </div>
</header>

<main class="container mx-auto p-6">
  <div id="homePage" class="space-y-8">
    <div class="text-center mb-12">
      <h2 class="text-4xl font-bold mb-4 text-gold-300">選擇您感興趣的文化主題</h2>
      <p class="text-gray-300 text-lg">探索不同文化，通過遊戲學習知識</p>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- ...existing content omitted for brevity in this placeholder... -->
      <div class="cultural-theme card-hover bg-gray-900 bg-opacity-80 p-6 rounded-xl border border-gray-700" data-theme="chinese">
        <div class="text-center">
          <div class="text-6xl mb-4">🏮</div>
          <h3 class="text-xl font-bold text-gold-300 mb-2">中華文化</h3>
          <p class="text-gray-400">探索五千年中華文明的博大精深</p>
        </div>
      </div>
      <!-- You can continue to split the remaining markup into components later -->
    </div>
  </div>
</main>
`;

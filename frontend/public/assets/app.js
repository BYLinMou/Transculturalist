// Minimal app bootstrap that injects the original HTML content into #app
// This file is intentionally small. 後續可以把各部分拆成模組元件。
import gameHtml from './app-content.js';

const mount = document.getElementById('app');
mount.innerHTML = gameHtml;

// Re-export placeholder hooks for future moduleization
// After injecting HTML, fetch available games and render into homePage
async function fetchAndRenderGames() {
	try {
		const res = await fetch('/api/games');
		const json = await res.json();
		if (!json.success) return;
		const games = json.games || [];
		const grid = document.querySelector('#homePage .grid');
		if (!grid) return;
		// Clear existing sample cards (keep first header area)
		grid.innerHTML = '';
		games.forEach(g => {
			const card = document.createElement('div');
			card.className = 'cultural-theme card-hover bg-gray-900 bg-opacity-80 p-6 rounded-xl border border-gray-700';
			card.dataset.game = g.id;
			card.innerHTML = `
				<div class="text-center">
					<div class="text-6xl mb-4">🎯</div>
					<h3 class="text-xl font-bold text-gold-300 mb-2">${g.name}</h3>
					<p class="text-gray-400">${g.description}</p>
				</div>
			`;
			card.addEventListener('click', () => {
				// For now, navigate to gameSelection and set currentTheme as id
				const evt = new CustomEvent('game-card-click', { detail: { gameId: g.id } });
				window.dispatchEvent(evt);
			});
			grid.appendChild(card);
		});
	} catch (err) {
		console.error('Failed to load games', err);
	}
}

fetchAndRenderGames();

export default { mount };

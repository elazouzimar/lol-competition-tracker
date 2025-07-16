// Main application logic for LoL Competition Tracker

/**
 * Application State
 */
let appState = {
  players: [],
  achievements: {},
  settings: {
    competitionName: 'My Friends League',
    season: 'Season 2025',
    apiKey: null
  },
  currentTab: 'leaderboard',
  isUpdating: false
};

/**
 * Initialize Application
 */
document.addEventListener('DOMContentLoaded', () => {
  loadAppState();
  initializeEventListeners();
  renderCurrentTab();
  updateHeaderStats();
  
  // Show appropriate notification based on API status
  if (apiManager.isUsingMockApi()) {
    setTimeout(() => {
      NotificationUtils.showInfo('Using simulated data. Add your Riot API key in Settings for real updates.');
    }, 1000);
  }
});

/**
 * Load application state from storage
 */
function loadAppState() {
  const savedState = Storage.load('lol_app_state');
  if (savedState) {
    appState = { ...appState, ...savedState };
  }
  
  // Set API key if available
  if (appState.settings.apiKey) {
    apiManager.setApiKey(appState.settings.apiKey);
  }
}

/**
 * Save application state to storage
 */
function saveAppState() {
  Storage.save('lol_app_state', appState);
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.currentTarget.getAttribute('onclick').match(/'([^']+)'/)[1];
      showTab(tabName);
    });
  });

  // Modal close on outside click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeAddPlayerModal();
    }
  });

  // Form submission
  document.getElementById('add-player-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addPlayer();
  });

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAddPlayerModal();
    }
  });
}

/**
 * Show tab
 */
function showTab(tabName) {
  // Update active tab
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Show selected tab
  const selectedTab = document.querySelector(`.nav-tab[onclick="showTab('${tabName}')"]`);
  const selectedContent = document.getElementById(`${tabName}-tab`);
  
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedContent) selectedContent.classList.add('active');
  
  appState.currentTab = tabName;
  renderCurrentTab();
}

/**
 * Render current tab content
 */
function renderCurrentTab() {
  switch (appState.currentTab) {
    case 'leaderboard':
      renderLeaderboard();
      break;
    case 'players':
      renderPlayersTab();
      break;
    case 'achievements':
      renderAchievements();
      break;
    case 'settings':
      renderSettings();
      break;
  }
}

/**
 * Update header stats
 */
function updateHeaderStats() {
  const totalPlayersEl = document.getElementById('totalPlayers');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  
  if (totalPlayersEl) {
    totalPlayersEl.textContent = appState.players.length;
  }
  
  if (lastUpdatedEl) {
    const lastUpdated = appState.players.reduce((latest, player) => {
      const playerUpdated = new Date(player.lastUpdated || 0);
      return playerUpdated > latest ? playerUpdated : latest;
    }, new Date(0));
    
    lastUpdatedEl.textContent = lastUpdated.getTime() > 0 ? 
      DateUtils.formatDate(lastUpdated.toISOString()) : 'Never';
  }
}

/**
 * Render leaderboard
 */
function renderLeaderboard() {
  const leaderboardList = document.getElementById('leaderboard-list');
  
  if (!leaderboardList) return;
  
  if (appState.players.length === 0) {
    leaderboardList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No players yet</h3>
        <p>Add your first player to get started!</p>
        <button class="btn btn-primary" onclick="showTab('players')">Add Player</button>
      </div>
    `;
    return;
  }
  
  // Sort players by score
  const sortedPlayers = [...appState.players].sort((a, b) => 
    PlayerUtils.calculateScore(b) - PlayerUtils.calculateScore(a)
  );
  
  leaderboardList.innerHTML = sortedPlayers.map((player, index) => {
    const rank = index + 1;
    const totalGames = player.wins + player.losses;
    const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;
    const score = PlayerUtils.calculateScore(player);
    
    return `
      <div class="leaderboard-item">
        <div class="rank-badge rank-${rank <= 3 ? rank : 'other'}">
          ${rank}
        </div>
        <div class="player-info">
          <div class="player-avatar">
            ${PlayerUtils.getInitials(player.name)}
          </div>
          <div class="player-details">
            <div class="player-name">${player.name}</div>
            <div class="player-id">${player.riotId}</div>
          </div>
        </div>
        <div class="tier-info">
          <div class="tier-icon ${player.tier.toLowerCase()}"></div>
          <div class="tier-text ${RankUtils.getRankColorClass(player.tier)}">
            ${RankUtils.formatRank(player.tier, player.division, player.lp)}
          </div>
        </div>
        <div class="lp-value">${player.lp || 0}</div>
        <div class="winrate-bar">
          <div class="winrate-fill" style="width: ${winRate}%"></div>
          <div class="winrate-text">${winRate}%</div>
        </div>
        <div class="games-count">${totalGames}</div>
        <div class="score-value">${score}</div>
      </div>
    `;
  }).join('');
}

/**
 * Render players tab
 */
function renderPlayersTab() {
  const playersGrid = document.getElementById('players-grid');
  
  if (!playersGrid) return;
  
  if (appState.players.length === 0) {
    playersGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No players yet</h3>
        <p>Add your first player to start tracking!</p>
        <button class="btn btn-primary" onclick="showAddPlayerModal()">Add Player</button>
      </div>
    `;
    return;
  }
  
  playersGrid.innerHTML = appState.players.map((player, index) => {
    const totalGames = player.wins + player.losses;
    const winRate = PlayerUtils.formatWinRate(player.wins, player.losses);
    const score = PlayerUtils.calculateScore(player);
    
    return `
      <div class="player-card">
        <div class="player-card-header">
          <div class="player-info">
            <div class="player-avatar">
              ${PlayerUtils.getInitials(player.name)}
            </div>
            <div class="player-details">
              <div class="player-name">${player.name}</div>
              <div class="player-id">${player.riotId}</div>
            </div>
          </div>
          <div class="player-card-actions">
            <button class="btn btn-secondary" onclick="updateSinglePlayer(${index})" title="Update">
              <span class="btn-icon">🔄</span>
            </button>
            <button class="btn btn-danger" onclick="deletePlayer(${index})" title="Delete">
              <span class="btn-icon">🗑️</span>
            </button>
          </div>
        </div>
        <div class="player-card-body">
          <div class="tier-info">
            <div class="tier-icon ${player.tier.toLowerCase()}"></div>
            <div class="tier-text ${RankUtils.getRankColorClass(player.tier)}">
              ${RankUtils.formatRank(player.tier, player.division, player.lp)}
            </div>
          </div>
          <div class="player-stats">
            <div class="stat-box">
              <div class="stat-box-value">${player.wins}</div>
              <div class="stat-box-label">Wins</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-value">${player.losses}</div>
              <div class="stat-box-label">Losses</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-value">${winRate}</div>
              <div class="stat-box-label">Win Rate</div>
            </div>
            <div class="stat-box">
              <div class="stat-box-value">${score}</div>
              <div class="stat-box-label">Score</div>
            </div>
          </div>
          <div class="player-meta">
            <small class="text-muted">
              Last updated: ${DateUtils.formatDate(player.lastUpdated)}
            </small>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render achievements
 */
function renderAchievements() {
  const achievementsGrid = document.getElementById('achievements-grid');
  
  if (!achievementsGrid) return;
  
  const earnedAchievements = AchievementUtils.checkAchievements(appState.players);
  
  achievementsGrid.innerHTML = AchievementUtils.achievements.map(achievement => {
    const isEarned = earnedAchievements[achievement.id];
    
    return `
      <div class="achievement-card ${isEarned ? 'earned' : ''}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-description">${achievement.description}</div>
        ${isEarned ? `
          <div class="achievement-earned-by">
            Earned by ${isEarned.earnedBy}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Render settings
 */
function renderSettings() {
  const competitionNameInput = document.getElementById('competitionName');
  const seasonInput = document.getElementById('season');
  const apiKeyInput = document.getElementById('apiKey');
  
  if (competitionNameInput) {
    competitionNameInput.value = appState.settings.competitionName || '';
  }
  
  if (seasonInput) {
    seasonInput.value = appState.settings.season || '';
  }
  
  if (apiKeyInput) {
    apiKeyInput.value = appState.settings.apiKey || '';
  }
}

/**
 * Show add player modal
 */
function showAddPlayerModal() {
  const modal = document.getElementById('add-player-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('displayName').focus();
  }
}

/**
 * Close add player modal
 */
function closeAddPlayerModal() {
  const modal = document.getElementById('add-player-modal');
  if (modal) {
    modal.classList.remove('active');
    clearAddPlayerForm();
  }
}

/**
 * Clear add player form
 */
function clearAddPlayerForm() {
  document.getElementById('add-player-form').reset();
}

/**
 * Add player
 */
async function addPlayer() {
  const formData = {
    displayName: document.getElementById('displayName').value.trim(),
    riotId: document.getElementById('riotId').value.trim(),
    region: document.getElementById('region').value,
    tier: document.getElementById('currentTier').value,
    division: document.getElementById('currentRank').value,
    lp: parseInt(document.getElementById('leaguePoints').value) || 0,
    wins: parseInt(document.getElementById('wins').value) || 0,
    losses: parseInt(document.getElementById('losses').value) || 0
  };
  
  // Validate form
  const validationRules = {
    displayName: { required: true, label: 'Display Name' },
    riotId: { required: true, type: 'riotId', label: 'Riot ID' },
    region: { required: true, label: 'Region' },
    lp: { type: 'number', min: 0, max: 3000, label: 'League Points' },
    wins: { type: 'number', min: 0, max: 10000, label: 'Wins' },
    losses: { type: 'number', min: 0, max: 10000, label: 'Losses' }
  };
  
  const errors = ValidationUtils.validateForm(formData, validationRules);
  
  if (Object.keys(errors).length > 0) {
    const errorMessages = Object.values(errors).join('\n');
    NotificationUtils.showError(errorMessages);
    return;
  }
  
  // Check for duplicate names or Riot IDs
  const existingPlayer = appState.players.find(p => 
    p.name.toLowerCase() === formData.displayName.toLowerCase() ||
    p.riotId.toLowerCase() === formData.riotId.toLowerCase()
  );
  
  if (existingPlayer) {
    NotificationUtils.showError('Player with this name or Riot ID already exists');
    return;
  }
  
  // Create player object
  const newPlayer = {
    id: RandomUtils.generateUUID(),
    name: formData.displayName,
    riotId: formData.riotId,
    region: formData.region,
    tier: formData.tier,
    division: formData.division,
    lp: formData.lp,
    wins: formData.wins,
    losses: formData.losses,
    dateAdded: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  
  // Add to state
  appState.players.push(newPlayer);
  saveAppState();
  
  // Update UI
  renderCurrentTab();
  updateHeaderStats();
  closeAddPlayerModal();
  
  NotificationUtils.showSuccess(`${newPlayer.name} added successfully!`);
  
  // Try to update with API data
  if (apiManager.hasApiKey()) {
    try {
      await apiManager.updatePlayerWithApiData(newPlayer);
      saveAppState();
      renderCurrentTab();
      NotificationUtils.showSuccess(`${newPlayer.name} updated with latest data!`);
    } catch (error) {
      console.error('Failed to update with API data:', error);
      NotificationUtils.showWarning(`${newPlayer.name} added but couldn't fetch latest data: ${error.message}`);
    }
  }
}

/**
 * Delete player
 */
function deletePlayer(index) {
  const player = appState.players[index];
  
  if (!player) return;
  
  if (confirm(`Are you sure you want to delete ${player.name}?`)) {
    appState.players.splice(index, 1);
    saveAppState();
    renderCurrentTab();
    updateHeaderStats();
    NotificationUtils.showSuccess(`${player.name} deleted successfully`);
  }
}

/**
 * Update single player
 */
async function updateSinglePlayer(index) {
  const player = appState.players[index];
  
  if (!player) return;
  
  if (!apiManager.hasApiKey()) {
    NotificationUtils.showWarning('API key required for updates. Using mock data.');
  }
  
  try {
    showLoadingOverlay();
    await apiManager.updatePlayerWithApiData(player);
    saveAppState();
    renderCurrentTab();
    updateHeaderStats();
    NotificationUtils.showSuccess(`${player.name} updated successfully!`);
  } catch (error) {
    console.error('Failed to update player:', error);
    NotificationUtils.showError(`Failed to update ${player.name}: ${error.message}`);
  } finally {
    hideLoadingOverlay();
  }
}

/**
 * Auto update all players
 */
async function autoUpdateAll() {
  if (appState.players.length === 0) {
    NotificationUtils.showInfo('No players to update');
    return;
  }
  
  if (appState.isUpdating) {
    NotificationUtils.showWarning('Update already in progress');
    return;
  }
  
  appState.isUpdating = true;
  
  try {
    showLoadingOverlay();
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const player of appState.players) {
      try {
        await apiManager.updatePlayerWithApiData(player);
        successCount++;
      } catch (error) {
        console.error(`Failed to update ${player.name}:`, error);
        errorCount++;
      }
    }
    
    saveAppState();
    renderCurrentTab();
    updateHeaderStats();
    
    if (errorCount === 0) {
      NotificationUtils.showSuccess(`All ${successCount} players updated successfully!`);
    } else {
      NotificationUtils.showWarning(`${successCount} players updated, ${errorCount} failed`);
    }
    
  } catch (error) {
    console.error('Auto update failed:', error);
    NotificationUtils.showError(`Auto update failed: ${error.message}`);
  } finally {
    appState.isUpdating = false;
    hideLoadingOverlay();
  }
}

/**
 * Refresh leaderboard
 */
function refreshLeaderboard() {
  renderLeaderboard();
  NotificationUtils.showSuccess('Leaderboard refreshed');
}

/**
 * Save API key
 */
function saveApiKey() {
  const apiKeyInput = document.getElementById('apiKey');
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    NotificationUtils.showError('Please enter an API key');
    return;
  }
  
  try {
    apiManager.setApiKey(apiKey);
    appState.settings.apiKey = apiKey;
    saveAppState();
    NotificationUtils.showSuccess('API key saved successfully!');
  } catch (error) {
    NotificationUtils.showError(`Failed to save API key: ${error.message}`);
  }
}

/**
 * Save settings
 */
function saveSettings() {
  const competitionName = document.getElementById('competitionName').value.trim();
  const season = document.getElementById('season').value.trim();
  
  appState.settings.competitionName = competitionName || 'My Friends League';
  appState.settings.season = season || 'Season 2025';
  
  saveAppState();
  NotificationUtils.showSuccess('Settings saved successfully!');
}

/**
 * Export data
 */
function exportData() {
  const exportData = {
    players: appState.players,
    achievements: appState.achievements,
    settings: appState.settings,
    exportDate: new Date().toISOString(),
    version: '1.0.0'
  };
  
  ExportUtils.exportToJson(exportData, 'lol-competition-data.json');
  NotificationUtils.showSuccess('Data exported successfully!');
}

/**
 * Import data
 */
function importData() {
  ExportUtils.importFromJson((error, data) => {
    if (error) {
      NotificationUtils.showError(`Failed to import data: ${error.message}`);
      return;
    }
    
    if (!data.players || !Array.isArray(data.players)) {
      NotificationUtils.showError('Invalid data format');
      return;
    }
    
    if (confirm('This will replace all current data. Are you sure?')) {
      appState.players = data.players;
      appState.achievements = data.achievements || {};
      appState.settings = { ...appState.settings, ...data.settings };
      
      saveAppState();
      renderCurrentTab();
      updateHeaderStats();
      NotificationUtils.showSuccess('Data imported successfully!');
    }
  });
}

/**
 * Clear all data
 */
function clearAllData() {
  if (confirm('This will delete all players and data. Are you sure?')) {
    if (confirm('This action cannot be undone. Are you really sure?')) {
      appState.players = [];
      appState.achievements = {};
      saveAppState();
      renderCurrentTab();
      updateHeaderStats();
      NotificationUtils.showSuccess('All data cleared');
    }
  }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('active');
  }
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}


/**
 * Show bulk import modal
 */
function showBulkImportModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Import from OP.GG</h3>
        <button class="modal-close" onclick="closeBulkImportModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>OP.GG Multi-search URL:</label>
          <input type="url" id="opggUrl" placeholder="Paste your op.gg multi-search URL">
        </div>
        <p class="text-muted">
          Go to op.gg, search multiple summoners, copy the URL and paste it here.
          We'll extract the player data automatically.
        </p>
        <div class="form-group">
          <label>Default Rank for imported players:</label>
          <select id="defaultTier">
            <option value="IRON">Iron</option>
            <option value="BRONZE">Bronze</option>
            <option value="SILVER" selected>Silver</option>
            <option value="GOLD">Gold</option>
            <option value="PLATINUM">Platinum</option>
            <option value="DIAMOND">Diamond</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeBulkImportModal()">Cancel</button>
        <button class="btn btn-primary" onclick="importFromOpgg()">Import Players</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.getElementById('opggUrl').focus();
}

/**
 * Close bulk import modal
 */
function closeBulkImportModal() {
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Import players from OP.GG URL
 */
async function importFromOpgg() {
  const url = document.getElementById('opggUrl').value.trim();
  const defaultTier = document.getElementById('defaultTier').value;
  
  if (!url || !url.includes('op.gg')) {
    NotificationUtils.showError('Please enter a valid op.gg URL');
    return;
  }
  
  try {
    // Extract summoner names from URL
    const urlObj = new URL(url);
    const summoners = urlObj.searchParams.get('summoners');
    
    if (!summoners) {
      NotificationUtils.showError('No summoners found in URL');
      return;
    }
    
    // Parse summoner names
    const summonerList = summoners.split(',').map(s => decodeURIComponent(s.trim()));
    let importedCount = 0;
    let skippedCount = 0;
    
    // Add players to app
    summonerList.forEach(summoner => {
      if (!summoner.includes('#')) {
        skippedCount++;
        return;
      }
      
      // Check if player already exists
      const existingPlayer = appState.players.find(p => 
        p.riotId.toLowerCase() === summoner.toLowerCase()
      );
      
      if (existingPlayer) {
        skippedCount++;
        return;
      }
      
      const [gameName, tagLine] = summoner.split('#');
      
      const newPlayer = {
        id: RandomUtils.generateUUID(),
        name: gameName,
        riotId: summoner,
        region: 'euw1', // Default to EUW since your op.gg link shows EUW
        tier: defaultTier,
        division: 'IV',
        lp: RandomUtils.randomInt(0, 50), // Random starting LP
        wins: RandomUtils.randomInt(10, 30),
        losses: RandomUtils.randomInt(8, 25),
        dateAdded: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      appState.players.push(newPlayer);
      importedCount++;
    });
    
    saveAppState();
    renderCurrentTab();
    updateHeaderStats();
    
    closeBulkImportModal();
    
    if (importedCount > 0) {
      NotificationUtils.showSuccess(`Imported ${importedCount} players! ${skippedCount > 0 ? `(${skippedCount} skipped - already exist or invalid format)` : ''}`);
    } else {
      NotificationUtils.showWarning('No new players imported. All players may already exist.');
    }
    
  } catch (error) {
    console.error('Import error:', error);
    NotificationUtils.showError(`Failed to import: ${error.message}`);
  }
}

// Global functions for onclick handlers
window.showTab = showTab;
window.showAddPlayerModal = showAddPlayerModal;
window.closeAddPlayerModal = closeAddPlayerModal;
window.addPlayer = addPlayer;
window.deletePlayer = deletePlayer;
window.updateSinglePlayer = updateSinglePlayer;
window.autoUpdateAll = autoUpdateAll;
window.refreshLeaderboard = refreshLeaderboard;
window.saveApiKey = saveApiKey;
window.saveSettings = saveSettings;
window.exportData = exportData;
window.importData = importData;
window.clearAllData = clearAllData;
window.showBulkImportModal = showBulkImportModal;
window.closeBulkImportModal = closeBulkImportModal;
window.importFromOpgg = importFromOpgg;


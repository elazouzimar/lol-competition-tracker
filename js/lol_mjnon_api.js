// API utilities for Riot Games API integration

/**
 * API Configuration
 */
const ApiConfig = {
  // Base URLs for different API regions
  baseUrls: {
    americas: 'https://americas.api.riotgames.com',
    asia: 'https://asia.api.riotgames.com',
    europe: 'https://europe.api.riotgames.com'
  },

  // Regional routing
  regionalRouting: {
    'na1': 'americas',
    'br1': 'americas',
    'la1': 'americas',
    'la2': 'americas',
    'euw1': 'europe',
    'eun1': 'europe',
    'tr1': 'europe',
    'ru': 'europe',
    'kr': 'asia',
    'jp1': 'asia',
    'oc1': 'asia'
  },

  // API endpoints
  endpoints: {
    account: '/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}',
    summoner: '/lol/summoner/v4/summoners/by-puuid/{puuid}',
    league: '/lol/league/v4/entries/by-summoner/{summonerId}',
    spectator: '/lol/spectator/v4/active-games/by-summoner/{summonerId}'
  },

  // Rate limiting
  rateLimits: {
    personal: {
      perSecond: 20,
      perMinute: 100
    },
    production: {
      perSecond: 500,
      perMinute: 30000
    }
  }
};

/**
 * API Client
 */
class RiotApiClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey || Storage.load('riot_api_key');
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.requestsThisSecond = 0;
    this.requestsThisMinute = 0;
    this.minuteResetTime = Date.now() + 60000;
  }

  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    Storage.save('riot_api_key', apiKey);
  }

  // Get API key
  getApiKey() {
    return this.apiKey;
  }

  // Check if API key is available
  hasApiKey() {
    return !!this.apiKey;
  }

  // Make API request with rate limiting
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  // Process request queue with rate limiting
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      // Check rate limits
      const now = Date.now();
      if (now > this.minuteResetTime) {
        this.requestsThisMinute = 0;
        this.minuteResetTime = now + 60000;
      }

      if (now - this.lastRequestTime < 1000) {
        if (this.requestsThisSecond >= ApiConfig.rateLimits.personal.perSecond) {
          await this.sleep(1000 - (now - this.lastRequestTime));
          this.requestsThisSecond = 0;
        }
      } else {
        this.requestsThisSecond = 0;
      }

      if (this.requestsThisMinute >= ApiConfig.rateLimits.personal.perMinute) {
        await this.sleep(this.minuteResetTime - now);
        this.requestsThisMinute = 0;
        this.minuteResetTime = Date.now() + 60000;
      }

      // Process next request
      const { url, options, resolve, reject } = this.requestQueue.shift();
      
      try {
        const response = await this.executeRequest(url, options);
        this.requestsThisSecond++;
        this.requestsThisMinute++;
        this.lastRequestTime = Date.now();
        resolve(response);
      } catch (error) {
        reject(error);
      }

      // Small delay between requests
      await this.sleep(50);
    }

    this.isProcessing = false;
  }

  // Execute HTTP request
  async executeRequest(url, options = {}) {
    if (!this.apiKey) {
      throw new Error('API key not set');
    }

    const headers = {
      'X-Riot-Token': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await this.handleApiError(response);
      throw error;
    }

    return await response.json();
  }

  // Handle API errors
  async handleApiError(response) {
    const status = response.status;
    let message = `API Error ${status}`;

    try {
      const errorData = await response.json();
      message = errorData.message || message;
    } catch (e) {
      // Ignore JSON parsing errors
    }

    switch (status) {
      case 400:
        message = 'Bad Request - Invalid parameters';
        break;
      case 401:
        message = 'Unauthorized - Invalid API key';
        break;
      case 403:
        message = 'Forbidden - API key expired or invalid';
        break;
      case 404:
        message = 'Not Found - Player not found';
        break;
      case 429:
        message = 'Rate Limited - Too many requests';
        break;
      case 500:
        message = 'Internal Server Error - Riot API issue';
        break;
      case 503:
        message = 'Service Unavailable - Riot API maintenance';
        break;
    }

    return new Error(message);
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get account by Riot ID
  async getAccountByRiotId(gameName, tagLine) {
    const region = 'americas'; // Default to americas for account lookup
    const url = `${ApiConfig.baseUrls[region]}${ApiConfig.endpoints.account
      .replace('{gameName}', encodeURIComponent(gameName))
      .replace('{tagLine}', encodeURIComponent(tagLine))}`;

    return await this.makeRequest(url);
  }

  // Get summoner by PUUID
  async getSummonerByPuuid(puuid, region) {
    const url = `https://${region}.api.riotgames.com${ApiConfig.endpoints.summoner
      .replace('{puuid}', puuid)}`;

    return await this.makeRequest(url);
  }

  // Get league entries by summoner ID
  async getLeagueEntriesBySummonerId(summonerId, region) {
    const url = `https://${region}.api.riotgames.com${ApiConfig.endpoints.league
      .replace('{summonerId}', summonerId)}`;

    return await this.makeRequest(url);
  }

  // Get current game by summoner ID
  async getCurrentGameBySummonerId(summonerId, region) {
    const url = `https://${region}.api.riotgames.com${ApiConfig.endpoints.spectator
      .replace('{summonerId}', summonerId)}`;

    return await this.makeRequest(url);
  }

  // Get player ranked info
  async getPlayerRankedInfo(riotId, region) {
    try {
      const { gameName, tagLine } = PlayerUtils.parseRiotId(riotId);
      
      // Step 1: Get account info
      const accountData = await this.getAccountByRiotId(gameName, tagLine);
      
      // Step 2: Get summoner info
      const summonerData = await this.getSummonerByPuuid(accountData.puuid, region);
      
      // Step 3: Get league entries
      const leagueEntries = await this.getLeagueEntriesBySummonerId(summonerData.id, region);
      
      // Find solo queue entry
      const soloQueue = leagueEntries.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
      
      if (!soloQueue) {
        throw new Error('No ranked solo queue data found');
      }
      
      return {
        summonerId: summonerData.id,
        summonerName: summonerData.name,
        summonerLevel: summonerData.summonerLevel,
        tier: soloQueue.tier,
        rank: soloQueue.rank,
        leaguePoints: soloQueue.leaguePoints,
        wins: soloQueue.wins,
        losses: soloQueue.losses,
        veteran: soloQueue.veteran,
        inactive: soloQueue.inactive,
        freshBlood: soloQueue.freshBlood,
        hotStreak: soloQueue.hotStreak,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching player ranked info:', error);
      throw error;
    }
  }

  // Update player with API data
  async updatePlayerWithApiData(player) {
    try {
      const rankedInfo = await this.getPlayerRankedInfo(player.riotId, player.region);
      
      // Update player data
      player.tier = rankedInfo.tier;
      player.division = rankedInfo.rank;
      player.lp = rankedInfo.leaguePoints;
      player.wins = rankedInfo.wins;
      player.losses = rankedInfo.losses;
      player.lastUpdated = rankedInfo.lastUpdated;
      
      // Store additional data
      player.summonerId = rankedInfo.summonerId;
      player.summonerLevel = rankedInfo.summonerLevel;
      player.veteran = rankedInfo.veteran;
      player.inactive = rankedInfo.inactive;
      player.freshBlood = rankedInfo.freshBlood;
      player.hotStreak = rankedInfo.hotStreak;
      
      return player;
    } catch (error) {
      console.error(`Failed to update player ${player.name}:`, error);
      throw error;
    }
  }

  // Check if player is in game
  async isPlayerInGame(player) {
    try {
      if (!player.summonerId) {
        // Need to get summoner ID first
        const rankedInfo = await this.getPlayerRankedInfo(player.riotId, player.region);
        player.summonerId = rankedInfo.summonerId;
      }
      
      const gameData = await this.getCurrentGameBySummonerId(player.summonerId, player.region);
      return gameData !== null;
    } catch (error) {
      if (error.message.includes('404')) {
        return false; // Player not in game
      }
      throw error;
    }
  }
}

/**
 * Mock API for testing without real API key
 */
class MockRiotApiClient {
  constructor() {
    this.mockData = new Map();
    this.initializeMockData();
  }

  // Initialize mock data
  initializeMockData() {
    const mockPlayers = [
      { tier: 'SILVER', rank: 'II', lp: 45, wins: 12, losses: 8 },
      { tier: 'GOLD', rank: 'IV', lp: 78, wins: 25, losses: 18 },
      { tier: 'BRONZE', rank: 'I', lp: 23, wins: 8, losses: 12 },
      { tier: 'PLATINUM', rank: 'III', lp: 56, wins: 45, losses: 32 },
      { tier: 'IRON', rank: 'II', lp: 67, wins: 5, losses: 15 }
    ];

    // Store mock data for different players
    mockPlayers.forEach((data, index) => {
      this.mockData.set(`player${index}`, data);
    });
  }

  // Simulate API delay
  async sleep(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock get player ranked info
  async getPlayerRankedInfo(riotId, region) {
    await this.sleep();
    
    const { gameName } = PlayerUtils.parseRiotId(riotId);
    let mockData = this.mockData.get(gameName.toLowerCase());
    
    if (!mockData) {
      // Generate random data for new players
      const tiers = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
      const ranks = ['IV', 'III', 'II', 'I'];
      
      mockData = {
        tier: RandomUtils.randomChoice(tiers),
        rank: RandomUtils.randomChoice(ranks),
        lp: RandomUtils.randomInt(0, 100),
        wins: RandomUtils.randomInt(5, 50),
        losses: RandomUtils.randomInt(5, 50)
      };
      
      this.mockData.set(gameName.toLowerCase(), mockData);
    }

    // Simulate some progression
    if (Math.random() < 0.3) {
      mockData.wins += RandomUtils.randomInt(0, 2);
      mockData.losses += RandomUtils.randomInt(0, 1);
      mockData.lp += RandomUtils.randomInt(-10, 15);
      mockData.lp = Math.max(0, Math.min(100, mockData.lp));
    }

    return {
      summonerId: `summoner_${gameName.toLowerCase()}`,
      summonerName: gameName,
      summonerLevel: RandomUtils.randomInt(30, 200),
      tier: mockData.tier,
      rank: mockData.rank,
      leaguePoints: mockData.lp,
      wins: mockData.wins,
      losses: mockData.losses,
      veteran: Math.random() < 0.1,
      inactive: Math.random() < 0.05,
      freshBlood: Math.random() < 0.1,
      hotStreak: Math.random() < 0.15,
      lastUpdated: new Date().toISOString()
    };
  }

  // Mock update player
  async updatePlayerWithApiData(player) {
    const rankedInfo = await this.getPlayerRankedInfo(player.riotId, player.region);
    
    player.tier = rankedInfo.tier;
    player.division = rankedInfo.rank;
    player.lp = rankedInfo.leaguePoints;
    player.wins = rankedInfo.wins;
    player.losses = rankedInfo.losses;
    player.lastUpdated = rankedInfo.lastUpdated;
    player.summonerId = rankedInfo.summonerId;
    player.summonerLevel = rankedInfo.summonerLevel;
    player.veteran = rankedInfo.veteran;
    player.inactive = rankedInfo.inactive;
    player.freshBlood = rankedInfo.freshBlood;
    player.hotStreak = rankedInfo.hotStreak;
    
    return player;
  }

  // Mock is player in game
  async isPlayerInGame(player) {
    await this.sleep(200);
    return Math.random() < 0.1; // 10% chance player is in game
  }

  // Mock methods to match real API
  setApiKey(apiKey) {
    // Mock implementation
  }

  getApiKey() {
    return 'mock_api_key';
  }

  hasApiKey() {
    return true;
  }
}

/**
 * API Manager - manages real and mock API clients
 */
class ApiManager {
  constructor() {
    this.realClient = new RiotApiClient();
    this.mockClient = new MockRiotApiClient();
    this.useMockApi = !this.realClient.hasApiKey();
  }

  // Get current client (real or mock)
  getCurrentClient() {
    return this.useMockApi ? this.mockClient : this.realClient;
  }

  // Set API key and switch to real client
  setApiKey(apiKey) {
    this.realClient.setApiKey(apiKey);
    this.useMockApi = false;
  }

  // Check if using mock API
  isUsingMockApi() {
    return this.useMockApi;
  }

  // Force use of mock API
  useMock() {
    this.useMockApi = true;
  }

  // Force use of real API
  useReal() {
    if (this.realClient.hasApiKey()) {
      this.useMockApi = false;
    } else {
      throw new Error('No API key set for real API client');
    }
  }

  // Delegate methods to current client
  async getPlayerRankedInfo(riotId, region) {
    return await this.getCurrentClient().getPlayerRankedInfo(riotId, region);
  }

  async updatePlayerWithApiData(player) {
    return await this.getCurrentClient().updatePlayerWithApiData(player);
  }

  async isPlayerInGame(player) {
    return await this.getCurrentClient().isPlayerInGame(player);
  }

  hasApiKey() {
    return this.getCurrentClient().hasApiKey();
  }

  getApiKey() {
    return this.getCurrentClient().getApiKey();
  }
}

// Create global API manager instance
const apiManager = new ApiManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ApiConfig,
    RiotApiClient,
    MockRiotApiClient,
    ApiManager,
    apiManager
  };
}
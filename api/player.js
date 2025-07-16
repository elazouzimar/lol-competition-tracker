export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { riotId, region } = req.query;
  const API_KEY = process.env.RIOT_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  
  if (!riotId || !region) {
    return res.status(400).json({ error: 'Missing riotId or region' });
  }
  
  try {
    const [gameName, tagLine] = riotId.split('#');
    
    // Regional routing
    const regionalRouting = {
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
    };
    
    const regionalEndpoint = regionalRouting[region] || 'americas';
    
    // Step 1: Get account by Riot ID
    const accountResponse = await fetch(
      `https://${regionalEndpoint}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      {
        headers: {
          'X-Riot-Token': API_KEY
        }
      }
    );
    
    if (!accountResponse.ok) {
      throw new Error(`Account not found: ${accountResponse.status}`);
    }
    
    const accountData = await accountResponse.json();
    
    // Step 2: Get summoner by PUUID
    const summonerResponse = await fetch(
      `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}`,
      {
        headers: {
          'X-Riot-Token': API_KEY
        }
      }
    );
    
    if (!summonerResponse.ok) {
      throw new Error(`Summoner not found: ${summonerResponse.status}`);
    }
    
    const summonerData = await summonerResponse.json();
    
    // Step 3: Get league entries
    const leagueResponse = await fetch(
      `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerData.id}`,
      {
        headers: {
          'X-Riot-Token': API_KEY
        }
      }
    );
    
    if (!leagueResponse.ok) {
      throw new Error(`League data not found: ${leagueResponse.status}`);
    }
    
    const leagueEntries = await leagueResponse.json();
    
    // Find solo queue entry
    const soloQueue = leagueEntries.find(entry => entry.queueType === 'RANKED_SOLO_5x5');
    
    if (!soloQueue) {
      return res.status(404).json({ error: 'No ranked solo queue data found' });
    }
    
    // Return formatted data
    const playerData = {
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
    
    res.status(200).json(playerData);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

const PLEX_URL = process.env.PLEX_URL || 'http://localhost:32400';
const PLEX_TOKEN = process.env.PLEX_TOKEN || '';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    plexConfigured: !!PLEX_TOKEN,
    plexUrl: PLEX_URL 
  });
});

app.get('/api/plex/movies', async (req, res) => {
  try {
    if (!PLEX_TOKEN) {
      return res.status(400).json({ 
        error: 'Plex token not configured. Set PLEX_TOKEN environment variable.' 
      });
    }

    const librariesResponse = await axios.get(`${PLEX_URL}/library/sections`, {
      params: { 'X-Plex-Token': PLEX_TOKEN },
      timeout: 10000
    });

    const movieLibrary = librariesResponse.data.MediaContainer.Directory?.find(
      dir => dir.type === 'movie'
    );

    if (!movieLibrary) {
      return res.status(404).json({ error: 'No movie library found in Plex' });
    }

    const moviesResponse = await axios.get(
      `${PLEX_URL}/library/sections/${movieLibrary.key}/all`,
      {
        params: { 'X-Plex-Token': PLEX_TOKEN },
        timeout: 30000
      }
    );

    const movies = moviesResponse.data.MediaContainer.Metadata || [];

    const formattedMovies = movies.map(movie => {
      const partKey = movie.Media?.[0]?.Part?.[0]?.key;
      
      return {
        id: movie.ratingKey,
        title: movie.title,
        year: movie.year || null,
        duration: movie.duration || null,
        videoPath: partKey || null
      };
    }).filter(movie => movie.videoPath);

    console.log(`Found ${formattedMovies.length} movies in Plex library`);
    res.json({ movies: formattedMovies });

  } catch (error) {
    console.error('Error fetching Plex movies:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch movies from Plex', 
      details: error.message 
    });
  }
});

app.get('/api/plex/video/*', async (req, res) => {
  try {
    if (!PLEX_TOKEN) {
      return res.status(400).json({ error: 'Plex token not configured' });
    }

    const videoPath = req.params[0];
    const cleanPath = videoPath.startsWith('/') ? videoPath : `/${videoPath}`;
    const fullUrl = `${PLEX_URL}${cleanPath}`;

    console.log(`Streaming video from: ${fullUrl}`);
    console.log(`With token: ${PLEX_TOKEN.substring(0, 10)}...`);

    // Forward range header if present (for video seeking)
    const headers = {};
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
      console.log(`Range request: ${req.headers.range}`);
    }

    const response = await axios({
      method: 'GET',
      url: fullUrl,
      params: { 'X-Plex-Token': PLEX_TOKEN },
      headers: headers,
      responseType: 'stream',
      timeout: 30000,
      validateStatus: (status) => status < 500 // Accept 206 for range requests
    });

    console.log(`Response status: ${response.status}`);

    // Set status code (206 for partial content, 200 for full)
    res.status(response.status);
    
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    if (response.headers['content-range']) {
      res.setHeader('Content-Range', response.headers['content-range']);
    }
    res.setHeader('Accept-Ranges', 'bytes');

    response.data.pipe(res);

  } catch (error) {
    console.error('Error streaming video:', error.message);
    res.status(500).json({ 
      error: 'Failed to stream video from Plex',
      details: error.message 
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const LEADERBOARD_FILE = path.join(__dirname, 'data', 'leaderboard.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

async function loadLeaderboard() {
  try {
    const data = await fs.readFile(LEADERBOARD_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveLeaderboard(scores) {
  await ensureDataDir();
  await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(scores, null, 2));
}

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await loadLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

app.post('/api/leaderboard', async (req, res) => {
  try {
    const { name, score, difficulty, timer, totalTime } = req.body;
    
    if (!name || score === undefined || !difficulty || !timer || !totalTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const leaderboard = await loadLeaderboard();
    const compositeScore = (score * 100) - Math.floor(totalTime / 10);
    
    leaderboard.push({
      name: name.trim().substring(0, 20),
      score: score,
      difficulty: difficulty,
      timer: timer,
      totalTime: Math.floor(totalTime),
      compositeScore: compositeScore,
      date: new Date().toISOString()
    });
    
    leaderboard.sort((a, b) => {
      if (b.compositeScore !== a.compositeScore) {
        return b.compositeScore - a.compositeScore;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.totalTime - b.totalTime;
    });
    
    const topScores = leaderboard.slice(0, 20);
    await saveLeaderboard(topScores);
    
    res.json({ success: true, leaderboard: topScores });
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Movie Trivia Game server running on port ${PORT}`);
  console.log(`📺 Plex URL: ${PLEX_URL}`);
  console.log(`🔑 Plex Token: ${PLEX_TOKEN ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`\n🌐 Access the game at: http://localhost:${PORT}`);
});

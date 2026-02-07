# Plex Movie Trivia Game

A web-based movie trivia game using your Plex movie library. Watch video clips and guess the movie from multiple choice options.

![Main_Screen](Screenshots/Main.png)

## Features

- Three difficulty levels with configurable clip lengths and timers
- Cross-device leaderboard with time-based rankings
- Real-time video streaming from your Plex server
- Mobile-friendly responsive design
- 10 rounds per game

![Game Screenshot](Screenshots/gameplay.png)

![Game Screenshot](Screenshots/gameplay_2.png)
## Quick Start

### Prerequisites

- Docker and Docker Compose
- Plex Media Server with a movie library
- Plex authentication token

### Get Your Plex Token

If you have Plex Desktop you can find it in 'C:\Users\[USER]\AppData\Local\Plex\Plex Media Server\Preferences.xml'.
OR
1. Go to https://app.plex.tv and play any media
2. Click the menu (⋯) → "Get Info" → "View XML"
3. Copy the token from the URL: `X-Plex-Token=YOUR_TOKEN`

More details: https://support.plex.tv/articles/204059436

### Installation

```bash
git clone https://github.com/yourusername/scene-that-plex.git
cd scene-that-plex
```

Edit `docker-compose.yml`:

```yaml
environment:
  - PLEX_URL=http://192.168.1.100:32400
  - PLEX_TOKEN=your_actual_token_here
```

Run:

```bash
docker-compose up -d
```

Access at: `http://localhost:3001`

Note: Uses port 3001 by default to avoid conflicts with Name That Plex.

## Configuration

### Difficulty Settings

| Difficulty | Clip Length | Timer |
|------------|-------------|-------|
| Easy | 20 seconds | 45 seconds |
| Medium | 15 seconds | 30 seconds |
| Hard | 10 seconds | 20 seconds |

Custom timer: 10-60 seconds (configurable in-game)

### Leaderboard Scoring

```
Score = (Correct Answers × 100) - (Total Time ÷ 10)
```

Examples:
- 10/10 in 60s = 994 points
- 10/10 in 120s = 988 points
- 8/10 in 60s = 794 points

## Network Access

Access from other devices on your network:

```
http://YOUR_HOST_IP:3001
```

## Troubleshooting

**No movies loading:**
- Verify Plex is running and accessible
- Check `PLEX_URL` and `PLEX_TOKEN` are correct
- Ensure you have a movie library in Plex

**Video not playing:**
- Check browser console for errors
- View Docker logs: `docker-compose logs`
- Try a different browser (Chrome/Firefox recommended)

**Port conflict:**
```yaml
ports:
  - "8080:3001"  # Use port 8080 instead
```

## Companion Apps

Check out the music version: [Plex-Music-Trivia-Game](https://github.com/whosliam/Plex-Music-Trivia-Game)
Check out the TV version: [Plex-TV-Trivia-Game](https://github.com/whosliam/Plex-TV-Trivia_game)


## License

MIT License - See LICENSE file

## Built With

Node.js • Express • React • Tailwind CSS • Docker

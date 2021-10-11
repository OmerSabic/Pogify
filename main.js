const fastify = require('fastify')({ logger: false });
const fs = require('fs');
const ytdl = require('ytdl-core');
const YoutubeMusicApi = require('youtube-music-api');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('pogifyDB.db')


// Library for getting some basic info on a youtube video
// from the video ID
const youtubeInfo = require('updated-youtube-info');

const api = new YoutubeMusicApi()


// Registering fastify libraries
fastify.register(require('point-of-view'), {
    engine: {
        ejs: require('ejs')
    }
})

fastify.register(require('fastify-static'), {
    root: path.join(__dirname, '/public'),
    prefix: '/public'
})

// Endpoint for the homepage
fastify.get('/', (req, res) => {
    res.view('/public/views/index.ejs')
})

// Endpoint for searching, returns a server-rendered ejs site
// with youtube music search results, with buttons to save to the server
fastify.get('/search', async (req, res) => {
    if (!req.query.q || !req.query.c) {
        return res
            .code(400)
            .send('Request missing query string')
    }

    api.initalize()
        .then(info => {
            api.search(req.query.q, req.query.c).then(result => {
                let searchData = JSON.stringify(result)
                return res.view('/public/views/search.ejs', { searchData: searchData, query: req.query.q })
            })
        })
})

// Endpoint to grab one of the downloaded mp3 files and play them in the browser
fastify.get('/listen/:videoId', async (req, res) => {
    var songs = await getDownloadedSongs();

    if (songs.includes(`${req.params.videoId}.mp3`, 0)) {
        db.get(`SELECT thumbId, length FROM songs WHERE id="${req.params.videoId}"`, (err, data) => {
            if (err) throw err;

            res.view('/public/views/listen.ejs', { videoId: req.params.videoId, thumbId: data.thumbId, length: data.length })
        })
    }
    else {
        res.send('song not on server')
    }
})

// POST request that downloads and saves a song's information in the database
fastify.post('/download', async (req, res) => {
    youtubeInfo(req.query.videoId, (err, songInfo) => {
        if (err) {
            console.log(err)
        }

        // Only reason this is here is because
        // I dislike the "- Topic" at the end of channel names
        songInfo.owner = songInfo.owner.replace('- Topic', '')

        let stmt = db.prepare('INSERT INTO songs values(?, ?, ?, ?, ?, ?)');

        // The "thumbid" column is the ID of the thumbnail of the video
        stmt.run(req.query.videoId, songInfo.title, songInfo.duration, req.query.thumbid, songInfo.owner, songInfo.channelId);
        stmt.finalize();

        ytdl(`https://www.youtube.com/watch?v=${req.query.videoId}`, { filter: 'audioonly' })
            .pipe(fs.createWriteStream(`./public/songs/${req.query.videoId}.mp3`));

    });
});

// Endpoint that returns the list of currently downloaded songs
fastify.get('/downloaded', async (req, res) => {
    db.all('SELECT * FROM songs LIMIT 20', (err, data) => {
        if (err) throw err;

        res.view('/public/views/downloaded', { songs: data });
    })
})

// Reads all the downloaded songs from the "songs" directory
async function getDownloadedSongs() {
    return new Promise((resolve, reject) => {
        fs.readdir('./public/songs', (err, data) => {
            if (err) throw err;

            resolve(data)
        })
    })
}

fastify.listen(3000, err => {
    if (err) throw err;

    console.log('Server started on port 3000');
})
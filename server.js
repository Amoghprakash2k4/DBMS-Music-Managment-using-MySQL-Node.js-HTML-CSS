const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// MySQL connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'root', // replace with your DB username
    password: 'Amogh@DBMS', // replace with your DB password
    database: 'DBMS' // replace with your DB name
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Root route to serve home.html
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Route to serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// POST route for login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Query to find the user by email
        const query = `SELECT * FROM user WHERE Email = ?`;
        const [results] = await pool.query(query, [email]);

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = results[0];

        // Check if the password matches (this is a simple comparison, consider using bcrypt for hashing)
        if (user.PasswordHash === password) {
            // Redirect to home.html upon successful login
            res.redirect('/home.html');
        } else {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while logging in.' });
    }
});



// Combined route to fetch all songs or search by title
app.get('/songs', async (req, res) => {
    const { title } = req.query; // Get the title from the query parameters

    if (!title) {
        return res.status(400).json({ error: 'Song title is required.' });
    }

    try {
        const [results] = await pool.query('SELECT * FROM song WHERE SongTitle = ?', [title]);

        if (results.length > 0) {
            res.json(results[0]); // Return the first match if found
        } else {
            res.status(404).json({ message: 'Song not found.' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error.' });
    }
});

// POST route to add a song
app.post('/songs', async (req, res) => {
    const { title, artist, artistId, album, albumId, genre } = req.body; 
    try {
        const artistQuery = `
            INSERT INTO artist (ArtistID, ArtistName, Genre) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE ArtistName = VALUES(ArtistName), Genre = VALUES(Genre)`;
        await pool.query(artistQuery, [artistId, artist, genre]);

        const albumQuery = `
            INSERT INTO album (AlbumID, AlbumName, Genre) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE AlbumName = VALUES(AlbumName), Genre = VALUES(Genre)`;
        await pool.query(albumQuery, [albumId, album, genre]);

        // Insert song
        const songQuery = 'INSERT INTO song (SongTitle, AlbumID, ArtistID, AlbumName, ArtistName, Genre) VALUES (?, ?, ?, ?, ?, ?)';
        const [results] = await pool.query(songQuery, [title, albumId, artistId, album, artist, genre]);

        res.status(201).json({ message: 'Song added successfully!', id: results.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE route to delete a song by title and artist
app.delete('/songs', async (req, res) => {
    const { songTitle, artistName } = req.body;

    if (!songTitle || !artistName) {
        return res.status(400).json({ error: 'Song title and artist name are required.' });
    }

    const deleteQuery = 'DELETE FROM song WHERE SongTitle = ? AND ArtistName = ?';
    
    try {
        const [results] = await pool.query(deleteQuery, [songTitle, artistName]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Song not found.' });
        }
        res.status(200).json({ message: 'Song deleted successfully.' });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'An error occurred while deleting the song.' });
    }
});

// POST route to create a playlist
app.post('/playlists', async (req, res) => {
    const { playlistName, createdBy } = req.body;

    try {
        // Insert the playlist into the database
        const playlistQuery = 'INSERT INTO playlist (PlaylistName, CreatedBy) VALUES (?, ?)';
        await pool.query(playlistQuery, [playlistName, createdBy]);

        res.status(201).json({ message: 'Playlist created successfully!' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while creating the playlist.' });
    }
});

// POST route to add songs to a playlist
app.post('/add-to-playlist', async (req, res) => {
    const { playlistName, songs } = req.body;

    try {
        // Step 1: Find the PlaylistID for the given playlist name
        const playlistQuery = 'SELECT PlaylistID FROM playlist WHERE PlaylistName = ?';
        const [playlistResult] = await pool.query(playlistQuery, [playlistName]);

        if (playlistResult.length === 0) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        const playlistId = playlistResult[0].PlaylistID;

        // Step 2: Insert each song into the playlist_song table
        for (const song of songs) {
            const { title } = song;

            // Find the SongID for the given song title
            const songQuery = 'SELECT SongID FROM song WHERE SongTitle = ?';
            const [songResult] = await pool.query(songQuery, [title]);

            if (songResult.length === 0) {
                return res.status(404).json({ error: `Song "${title}" not found.` });
            }

            const songId = songResult[0].SongID;

            // Insert into playlist_song table
            const insertQuery = `
                INSERT INTO playlist_song (PlaylistID, SongID, SongTitle) 
                VALUES (?, ?, ?)`;
            await pool.query(insertQuery, [playlistId, songId, title]);
        }

        res.status(201).json({ message: 'Songs added to playlist successfully!' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while adding songs to the playlist.' });
    }
});

// POST route to filter songs by genre
app.post('/get-playlist-songs', async (req, res) => {
    const { playlistName } = req.body;

    if (!playlistName) {
        return res.status(400).json({ error: 'Playlist name is required.' });
    }

    const query = `
        SELECT ps.SongTitle
        FROM playlist p
        JOIN playlist_song ps ON p.PlaylistID = ps.PlaylistID
        WHERE p.PlaylistName = ?
    `;

    try {
        const [results] = await pool.query(query, [playlistName]);
        res.json(results); // Send songs back as JSON
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: 'An error occurred while fetching songs.' });
    }
});

app.post('/like-song', async (req, res) => {
    const { username, songTitle } = req.body;

    if (!username || !songTitle) {
        return res.status(400).json({ error: 'Username and song title are required.' });
    }

    try {
        // Find the UserID for the given username
        const userQuery = `SELECT UserID FROM user WHERE UserName = ?`;
        const [userResult] = await pool.query(userQuery, [username]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userId = userResult[0].UserID;

        // Find the Song details for the given song title
        const songQuery = `SELECT SongID, ArtistName, AlbumName FROM song WHERE SongTitle = ?`;
        const [songResult] = await pool.query(songQuery, [songTitle]);

        if (songResult.length === 0) {
            return res.status(404).json({ error: 'Song not found.' });
        }

        const { SongID, ArtistName, AlbumName } = songResult[0];

        // Insert the liked song into user_likedsong
        const insertQuery = `
            INSERT INTO user_likedsong (UserID, SongID, SongTitle, ArtistName, AlbumName)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE SongTitle = VALUES(SongTitle), ArtistName = VALUES(ArtistName), AlbumName = VALUES(AlbumName)
        `;
        await pool.query(insertQuery, [userId, SongID, songTitle, ArtistName, AlbumName]);

        res.status(201).json({ message: 'Song liked successfully!' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while liking the song.' });
    }
});

// GET route to retrieve all liked songs for a user
// POST route to add multiple liked songs by username
app.post('/add-liked-songs', async (req, res) => {
    const { username, songTitles } = req.body;

    if (!username || !Array.isArray(songTitles) || songTitles.length === 0) {
        return res.status(400).json({ error: 'Username and at least one song title are required.' });
    }

    try {
        // Find the UserID for the given username
        const userQuery = `SELECT UserID FROM user WHERE UserName = ?`;
        const [userResult] = await pool.query(userQuery, [username]);

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const userId = userResult[0].UserID;

        // Prepare to insert multiple songs
        const insertPromises = songTitles.map(async (songTitle) => {
            // Find the Song details for the given song title
            const songQuery = `SELECT SongID, ArtistName, AlbumName FROM song WHERE SongTitle = ?`;
            const [songResult] = await pool.query(songQuery, [songTitle]);

            if (songResult.length === 0) {
                throw new Error(`Song "${songTitle}" not found.`);
            }

            const { SongID, ArtistName, AlbumName } = songResult[0];

            // Insert the liked song into user_likedsong
            const insertQuery = `
                INSERT INTO user_likedsong (UserID, SongID, SongTitle, ArtistName, AlbumName)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE SongTitle = VALUES(SongTitle), ArtistName = VALUES(ArtistName), AlbumName = VALUES(AlbumName)
            `;
            return pool.query(insertQuery, [userId, SongID, songTitle, ArtistName, AlbumName]);
        });

        await Promise.all(insertPromises);

        res.status(201).json({ message: 'Songs liked successfully!' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while liking the songs.' });
    }
});

// DELETE route to remove a playlist
// DELETE route to remove a playlist by PlaylistName
app.delete('/delete-playlist', async (req, res) => {
    const { playlistName } = req.body;

    if (!playlistName) {
        return res.status(400).json({ error: 'Playlist name is required.' });
    }

    try {
        const deleteQuery = `DELETE FROM playlist WHERE PlaylistName = ?`;
        const [result] = await pool.query(deleteQuery, [playlistName]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        res.status(200).json({ message: 'Playlist deleted successfully.' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'An error occurred while deleting the playlist.' });
    }
});
// Feedback submission endpoint
app.post('/submit-feedback', async (req, res) => {
    const { name, email, subject, message } = req.body;
    console.log('Received feedback:', { name, email, subject, message });

    const query = `
        INSERT INTO ContactFeedback (Name, Email, Subject, Message)
        VALUES (?, ?, ?, ?)
    `;

    try {
        const result = await pool.query(query, [name, email, subject, message]);
        console.log('Insert result:', result);
        res.json({ message: 'Feedback submitted successfully!' });
    } catch (error) {
        console.error('Error inserting feedback:', error);
        res.status(500).json({ error: 'An error occurred while saving feedback.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.static('.')); // Serve files from the current folder
app.use(express.json());

cloudinary.config({
  cloud_name: 'dkavjghxk',
  api_key: '528744698186842',
  api_secret: '2gdHnCkGA2C9kuh0nkAimL2mCVE',
  secure: true
});

// Több fájl feltöltése (képek és videók)
app.post('/upload', upload.array('media', 10), (req, res) => {
  const promises = req.files.map(file => {
    const fileStr = file.buffer.toString('base64');
    
    // Feltöltés Cloudinary-ra anélkül, hogy átméretezné vagy módosítaná a fájlokat
    return cloudinary.uploader.upload(`data:${file.mimetype};base64,${fileStr}`, {
      folder: 'feltoltott_kepek_videok', // A fájlok mentése egy mappába
      resource_type: file.mimetype.startsWith('video') ? 'video' : 'image', // Fájl típusa (kép vagy videó)
      // Minőség megőrzésére nincs módosítás
    });
  });

  Promise.all(promises)
    .then(results => {
      const newMedia = results.map(result => result.secure_url);

      // Olvasd be az aktuális listát
      let existingMedia = [];
      try {
        const fileData = fs.readFileSync('media.json'); // Ensure the file is in the same folder
        if (fileData.length > 0) {
          existingMedia = JSON.parse(fileData);
        }
      } catch (e) {
        console.error('Nem sikerült beolvasni a JSON fájlt:', e);
      }

      // Új képek a lista elejére
      existingMedia = [...newMedia, ...existingMedia];

      // Írjuk vissza a frissített listát a fájlba
      fs.writeFileSync('media.json', JSON.stringify(existingMedia, null, 2)); // Ensure the file is in the same folder
      console.log('Új fájlok mentve:', newMedia);

      // Válasz a sikeres feltöltésről
      res.json({ urls: newMedia });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Hiba a feltöltés során.' });
    });
});

// Képek és videók listázása
app.get('/media', (req, res) => {
  try {
    let media = [];
    try {
      const fileData = fs.readFileSync('media.json'); // Ensure the file is in the same folder
      if (fileData.length > 0) {
        media = JSON.parse(fileData);
      } else {
        console.log('media.json is empty.');
      }
    } catch (e) {
      console.error('Error reading media.json:', e);
    }

    const mediaWithIds = media.map((url, index) => ({
      id: `media_${index}`,
      url
    }));

    console.log('Media:', mediaWithIds); // Debug log
    res.json(mediaWithIds);
  } catch (e) {
    console.error('Error processing /media endpoint:', e);
    res.status(500).json({ error: 'Error processing /media endpoint.' });
  }
});

app.listen(3000, () => {
  console.log('Szerver fut a http://localhost:3000 címen');
});

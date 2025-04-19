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
app.post('/upload', upload.array('media', 10), async (req, res) => {
  let newMedia = [];
  if (req.files.length === 0 && req.body.media) {
    // req.body.media lehet string vagy tömb
    if (Array.isArray(req.body.media)) {
      newMedia = req.body.media.map((url, i) => ({
        id: `media_${Date.now()}_${i}`,
        url
      }));
    } else {
      newMedia = [{
        id: `media_${Date.now()}_0`,
        url: req.body.media
      }];
    }
  } else {
    newMedia = await Promise.all(req.files.map(async (file, i) => {
      const fileStr = file.buffer.toString('base64');
      const result = await cloudinary.uploader.upload(`data:${file.mimetype};base64,${fileStr}`, {
        folder: 'feltoltott_kepek_videok',
        resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
      });
      return {
        id: `media_${Date.now()}_${i}`,
        url: result.secure_url
      };
    }));
  }

  // Olvasd be az aktuális listát
  let existingMedia = [];
  try {
    const fileData = fs.readFileSync('media.json');
    if (fileData.length > 0) {
      existingMedia = JSON.parse(fileData);
    }
  } catch (e) {
    console.error('Nem sikerült beolvasni a JSON fájlt:', e);
  }

  // Új képek a lista elejére
  existingMedia = [...newMedia, ...existingMedia];

  // Írjuk vissza a frissített listát a fájlba
  fs.writeFileSync('media.json', JSON.stringify(existingMedia, null, 2));
  console.log('Új fájlok mentve:', newMedia);

  res.json({ urls: newMedia.map(m => m.url) });
});

// Képek és videók listázása
app.get('/media', (req, res) => {
  try {
    let media = [];
    try {
      const fileData = fs.readFileSync('media.json');
      if (fileData.length > 0) {
        media = JSON.parse(fileData);
        // Javítás: alakítsd át a sima stringeket objektummá
        media = media.map((item, idx) => {
          if (typeof item === 'string') {
            return { id: `media_${idx}`, url: item };
          }
          // ha már objektum, hagyd úgy
          return item;
        });
      } else {
        console.log('media.json is empty.');
      }
    } catch (e) {
      console.error('Error reading media.json:', e);
    }

    res.json(media);
  } catch (e) {
    console.error('Error processing /media endpoint:', e);
    res.status(500).json({ error: 'Error processing /media endpoint.' });
  }
});

// Képek törlése
app.delete('/media/:id', (req, res) => {
  const idToDelete = req.params.id;
  let media = [];
  try {
    const fileData = fs.readFileSync('media.json');
    if (fileData.length > 0) {
      media = JSON.parse(fileData);
    }
  } catch (e) {
    return res.status(500).json({ error: 'Nem sikerült beolvasni a media.json-t.' });
  }

  const item = media.find(m => m.id === idToDelete);
  if (!item) {
    return res.status(404).json({ error: 'Nincs ilyen média.' });
  }

  // (Opcionális) Cloudinary-ból is törlés:
  // Ha a Cloudinary public_id-t is tárolod, akkor:
  // await cloudinary.uploader.destroy(item.public_id);

  // Törlés a listából
  media = media.filter(m => m.id !== idToDelete);

  try {
    fs.writeFileSync('media.json', JSON.stringify(media, null, 2));
  } catch (e) {
    return res.status(500).json({ error: 'Nem sikerült frissíteni a media.json-t.' });
  }

  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Szerver fut a http://localhost:3000 címen');
});

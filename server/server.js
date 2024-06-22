const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.post('/overlay', async (req, res) => {
  const { backgroundUrl, overlayUrl } = req.body;

  try {
    // Download the videos from S3
    const backgroundVideoPath = await downloadVideo(backgroundUrl, 'background.mp4');
    const overlayVideoPath = await downloadVideo(overlayUrl, 'overlay.mp4');

    // Render the overlay video
    const outputLocation = path.join(__dirname, 'public/output.mp4');
    await renderOverlayVideo(backgroundVideoPath, overlayVideoPath, outputLocation);

    // Return the URL of the resulting video
    res.json({ outputUrl: `${req.protocol}://${req.get('host')}/public/output.mp4` });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing video');
  }
});

const downloadVideo = async (url, filename) => {
  const filePath = path.join(__dirname, filename);
  const response = await axios({ url, responseType: 'stream' });
  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
};

const renderOverlayVideo = async (backgroundPath, overlayPath, outputLocation) => {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -i ${backgroundPath} -i ${overlayPath} -filter_complex "[0:v][1:v] overlay=0:0" ${outputLocation}`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

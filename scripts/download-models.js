const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const MODELS_DIR = path.join(__dirname, '..', 'models');

const REQUIRED_MODELS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function downloadModels() {
  // Create models directory if it doesn't exist
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log('Downloading face-api.js models...');
  
  for (const modelFile of REQUIRED_MODELS) {
    const url = `${MODEL_BASE_URL}/${modelFile}`;
    const filepath = path.join(MODELS_DIR, modelFile);
    
    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`Skipping existing file: ${modelFile}`);
      continue;
    }
    
    try {
      await downloadFile(url, filepath);
    } catch (error) {
      console.error(`Error downloading ${modelFile}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('All models downloaded successfully!');
}

downloadModels().catch(console.error);
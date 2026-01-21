import archiver from 'archiver';
import { createWriteStream, createReadStream, statSync, cpSync, existsSync, mkdirSync } from 'fs';
import https from 'https';
import { dirname } from 'path';

const UPLOAD_URL = process.argv[2];

if (!UPLOAD_URL) {
  console.error('Usage: node create-deploy-zip.mjs <upload-url>');
  process.exit(1);
}

const ZIP_PATH = '/tmp/amplify-standalone-deploy.zip';
const STANDALONE_PATH = '.next/standalone/frontend';

async function createZip() {
  console.log('Creating ZIP file from standalone build...');

  // Copy static files to standalone
  console.log('Copying static files...');
  if (existsSync('.next/static')) {
    const staticDest = `${STANDALONE_PATH}/.next/static`;
    if (!existsSync(dirname(staticDest))) {
      mkdirSync(dirname(staticDest), { recursive: true });
    }
    cpSync('.next/static', staticDest, { recursive: true });
  }

  // Copy public folder
  if (existsSync('public')) {
    cpSync('public', `${STANDALONE_PATH}/public`, { recursive: true });
  }

  const output = createWriteStream(ZIP_PATH);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // Add standalone directory contents
  archive.directory(STANDALONE_PATH, false);

  await archive.finalize();

  return new Promise((resolve) => {
    output.on('close', () => {
      const size = statSync(ZIP_PATH).size;
      console.log(`ZIP created: ${(size / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });
  });
}

async function uploadZip(url) {
  console.log('Uploading ZIP to Amplify...');

  const fileStream = createReadStream(ZIP_PATH);
  const fileSize = statSync(ZIP_PATH).size;

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': fileSize
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Upload successful! Status:', res.statusCode);
          resolve();
        } else {
          console.error('Upload failed. Status:', res.statusCode);
          console.error('Response:', body);
          reject(new Error(`Upload failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });
}

async function main() {
  try {
    await createZip();
    await uploadZip(UPLOAD_URL);
    console.log('\nUpload complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

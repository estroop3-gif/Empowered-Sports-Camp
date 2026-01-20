import archiver from 'archiver';
import { createWriteStream, createReadStream, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import http from 'http';

const UPLOAD_URL = process.argv[2];

if (!UPLOAD_URL) {
  console.error('Usage: node deploy-to-amplify.mjs <upload-url>');
  process.exit(1);
}

const ZIP_PATH = '/tmp/amplify-deploy.zip';

async function createZip() {
  console.log('Creating ZIP file...');

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

  // Add all files except excluded ones
  archive.glob('**/*', {
    cwd: '/home/estro/Empowered-sports-camp/frontend',
    ignore: [
      'node_modules/**',
      '.git/**',
      '.next/**',
      '*.log',
      '.env.old-aws',
      '.env.new-aws',
      'deploy-to-amplify.mjs'
    ],
    dot: true
  });

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

  const parsedUrl = new URL(url);
  const protocol = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = protocol.request(url, {
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
    console.log('\nDeployment initiated successfully!');
    console.log('Check the Amplify console for build progress.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

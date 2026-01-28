import archiver from 'archiver';
import { createWriteStream, createReadStream, writeFileSync, statSync, existsSync, cpSync, mkdirSync, rmSync, readdirSync } from 'fs';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import path from 'path';

const UPLOAD_URL = process.argv[2];
const SKIP_BUILD = process.argv.includes('--skip-build');

if (!UPLOAD_URL) {
  console.error('Usage: node deploy-to-amplify.mjs <upload-url> [--skip-build]');
  process.exit(1);
}

const PROJECT_DIR = '/home/estro/Empowered-sports-camp/frontend';
const ZIP_PATH = '/tmp/amplify-deploy.zip';
const DEPLOY_DIR = '/tmp/amplify-deploy-staging';

async function buildProject() {
  if (SKIP_BUILD) {
    console.log('Skipping build (--skip-build flag)...');
    return;
  }

  console.log('Building Next.js project...');
  try {
    execSync('npm run build', {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed!');
    process.exit(1);
  }
}

async function prepareStagingDir() {
  console.log('Preparing deployment package in .amplify-hosting format...');

  if (existsSync(DEPLOY_DIR)) {
    rmSync(DEPLOY_DIR, { recursive: true });
  }

  // Create Amplify hosting structure:
  // .amplify-hosting/
  //   compute/default/  (SSR server files)
  //   static/           (static assets)
  //   deploy-manifest.json
  const computeDir = path.join(DEPLOY_DIR, '.amplify-hosting', 'compute', 'default');
  const staticDir = path.join(DEPLOY_DIR, '.amplify-hosting', 'static');
  mkdirSync(computeDir, { recursive: true });
  mkdirSync(staticDir, { recursive: true });

  // Copy standalone output to compute/default
  const standalonePath = path.join(PROJECT_DIR, '.next', 'standalone');
  if (!existsSync(standalonePath)) {
    console.error('Error: .next/standalone not found. Run npm run build first.');
    process.exit(1);
  }

  // Handle monorepo nesting
  const nestedAppPath = path.join(standalonePath, 'frontend');
  if (existsSync(nestedAppPath)) {
    console.log('Monorepo detected - flattening frontend/ to compute/default...');
    cpSync(nestedAppPath, computeDir, { recursive: true });
    const rootNodeModules = path.join(standalonePath, 'node_modules');
    if (existsSync(rootNodeModules)) {
      cpSync(rootNodeModules, path.join(computeDir, 'node_modules'), { recursive: true });
    }
  } else {
    cpSync(standalonePath, computeDir, { recursive: true });
  }

  // Copy .next/static to compute/default/.next/static AND to static/_next/static
  const staticSrc = path.join(PROJECT_DIR, '.next', 'static');
  if (existsSync(staticSrc)) {
    const computeStaticDest = path.join(computeDir, '.next', 'static');
    mkdirSync(path.dirname(computeStaticDest), { recursive: true });
    cpSync(staticSrc, computeStaticDest, { recursive: true });

    const hostingStaticDest = path.join(staticDir, '_next', 'static');
    mkdirSync(path.dirname(hostingStaticDest), { recursive: true });
    cpSync(staticSrc, hostingStaticDest, { recursive: true });
  }

  // Copy public folder to compute/default/public AND to static/
  const publicSrc = path.join(PROJECT_DIR, 'public');
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, path.join(computeDir, 'public'), { recursive: true });
    // Copy public files to static root (excluding subdirectories that start with _)
    cpSync(publicSrc, staticDir, { recursive: true });
  }

  // Create deploy-manifest.json
  const manifest = {
    version: 1,
    routes: [
      {
        path: "/_next/static/*",
        target: {
          kind: "Static"
        }
      },
      {
        path: "/*.*",
        target: {
          kind: "Static"
        },
        fallback: {
          kind: "Compute",
          src: "default"
        }
      },
      {
        path: "/*",
        target: {
          kind: "Compute",
          src: "default"
        }
      }
    ],
    computeResources: [
      {
        name: "default",
        entrypoint: "server.js",
        runtime: "nodejs18.x"
      }
    ],
    framework: {
      name: "next",
      version: "16.0.8"
    }
  };

  writeFileSync(
    path.join(DEPLOY_DIR, '.amplify-hosting', 'deploy-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('Deployment package prepared.');
}

async function createZip() {
  console.log('Creating ZIP file...');

  const output = createWriteStream(ZIP_PATH);
  const archive = archiver('zip', { zlib: { level: 6 } });

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

  archive.glob('**/*', {
    cwd: DEPLOY_DIR,
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
    await buildProject();
    await prepareStagingDir();
    await createZip();
    await uploadZip(UPLOAD_URL);
    console.log('\nDeployment initiated successfully!');
    console.log('Site will be live at: https://main.dlqgoanojaxo4.amplifyapp.com');
    console.log('And at: https://empoweredsportscamp.com (once DNS is verified)');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

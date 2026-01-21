import { AmplifyClient, UpdateAppCommand, UpdateBranchCommand, StartJobCommand } from '@aws-sdk/client-amplify';

const client = new AmplifyClient({
  region: 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const APP_ID = 'd2pjln5utirp2i';
const REPO_URL = 'https://git-codecommit.us-east-2.amazonaws.com/v1/repos/empowered-sports-camp';
const IAM_ROLE_ARN = 'arn:aws:iam::024460283944:role/AmplifyServiceRole';

async function main() {
  try {
    console.log('Updating Amplify app to connect to CodeCommit...');

    // Update app with repository
    const updateAppCommand = new UpdateAppCommand({
      appId: APP_ID,
      repository: REPO_URL,
      iamServiceRoleArn: IAM_ROLE_ARN
    });

    const updateResult = await client.send(updateAppCommand);
    console.log('App updated:', updateResult.app?.name);

    // Update branch to enable auto-build
    console.log('Updating branch configuration...');
    const updateBranchCommand = new UpdateBranchCommand({
      appId: APP_ID,
      branchName: 'main',
      enableAutoBuild: true
    });
    await client.send(updateBranchCommand);
    console.log('Branch updated');

    // Start a build job
    console.log('Starting build job...');
    const startJobCommand = new StartJobCommand({
      appId: APP_ID,
      branchName: 'main',
      jobType: 'RELEASE'
    });
    const jobResult = await client.send(startJobCommand);
    console.log('Build job started:', jobResult.jobSummary?.jobId);

    console.log('\nDeployment initiated successfully!');
    console.log(`View progress at: https://us-east-2.console.aws.amazon.com/amplify/apps/${APP_ID}/overview`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.name === 'BadRequestException') {
      console.error('Details:', error);
    }
    process.exit(1);
  }
}

main();

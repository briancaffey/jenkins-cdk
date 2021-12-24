import * as cdk from '@aws-cdk/core';
import { JenkinsEc2Swarm, JenkinsEc2SwarmProps } from './';

const env = {
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  account: process.env.AWS_ACCOUNT_ID,
};

const app = new cdk.App();
const stack = new cdk.Stack(app, 'JenkinsEc2Stack', { env });


const props: JenkinsEc2SwarmProps = {
  keyPairName: process.env.KEY_PAIR_NAME!,
  hostName: process.env.HOSTED_ZONE_NAME!,
  zoneName: process.env.JENKINS_HOSTNAME!,
};

const construct = new JenkinsEc2Swarm(stack, 'JenkinsEc2Example', props);

/**
 * Add tagging for this construct and all child constructs
 */
cdk.Tags.of(construct).add('stack', 'JenkinsEc2Example');

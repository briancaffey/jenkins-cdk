import * as cdk from '@aws-cdk/core';
import { JenkinsEc2, JenkinsEc2Props } from './jenkins-ec2';

const env = {
  region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  account: process.env.AWS_ACCOUNT_ID,
};

const app = new cdk.App();
const stack = new cdk.Stack(app, 'JenkinsEc2Stack', { env });


const props: JenkinsEc2Props = {
  keyPairName: process.env.KEY_PAIR_NAME!,
};

const construct = new JenkinsEc2(stack, 'JenkinsEc2Example', props);

/**
 * Add tagging for this construct and all child constructs
 */
cdk.Tags.of(construct).add('stack', 'JenkinsEc2Example');

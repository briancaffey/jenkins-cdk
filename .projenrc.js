const { AwsCdkConstructLibrary } = require('projen');
const project = new AwsCdkConstructLibrary({
  author: 'Brian Caffey',
  authorAddress: 'briancaffey2010@gmail.com',
  cdkVersion: '1.128.0',
  defaultReleaseBranch: 'main',
  name: 'jenkins-cdk',
  repositoryUrl: 'https://github.com/briancaffey2010/jenkins-cdk.git',
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-cloudformation',
    '@aws-cdk/aws-certificatemanager',
    '@aws-cdk/aws-cloudwatch',
    '@aws-cdk/aws-logs',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-events',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-secretsmanager',
    '@aws-cdk/aws-route53',
    '@aws-cdk/aws-s3',
    '@aws-cdk/aws-s3-deployment',
    '@aws-cdk/aws-cloudfront',
    '@aws-cdk/aws-route53-targets',
    '@aws-cdk/aws-ecr',
    '@aws-cdk/aws-ecr-assets',
    '@aws-cdk/aws-ec2',
    '@aws-cdk/aws-efs',
    '@aws-cdk/aws-rds',
    '@aws-cdk/aws-ssm',
    '@aws-cdk/aws-elasticache',
    '@aws-cdk/aws-elasticloadbalancingv2',
    '@aws-cdk/aws-ecs',
    '@aws-cdk/aws-ecs-patterns',
    '@aws-cdk/aws-eks',
    '@aws-cdk/aws-autoscaling',
    '@aws-cdk/aws-rds',
    '@aws-cdk/aws-iam',
  ],
  gitignore: ['notes/', '.env', 'cdk.context.json', 'cdk.out'],
  // cdkDependencies: undefined,        /* Which AWS CDK modules (those that start with "@aws-cdk/") does this library require when consumed? */
  // cdkTestDependencies: undefined,    /* AWS CDK modules required for testing. */
  // deps: [],                          /* Runtime dependencies of this module. */
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */
  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // release: undefined,                /* Add release management to this project. */
});
project.synth();
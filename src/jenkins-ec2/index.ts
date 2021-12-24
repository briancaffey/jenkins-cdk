import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';


/**
 * Properties for configuring Jenkins to run on EC2
 */
export interface JenkinsEc2Props {
  /**
   * Name of the key-pair used to SSH into the Jenkins instance
   */
  readonly keyPairName: string;
}

/**
 * JenkinsEc2 construct for running Jenkins on EC2
 *
 * See project README for instructions on how to configure the plugin in Jenkins UI
 *
 * Designed to use with Jenkins EC2 Plugin
 * See https://plugins.jenkins.io/ec2/ for plugin details
 */
export class JenkinsEc2 extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: JenkinsEc2Props) {
    super(scope, id);

    /**
     * VPC for Jenkins. For simplicity, this VPC only contains public subnets
     * and has no NAT Gateways
     */
    const vpc = new ec2.Vpc(this, 'vpc', {
      cidr: '10.0.0.0/16',
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'public-subnet-1',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // SG for Jenkins
    const securityGroup = new ec2.SecurityGroup(scope, 'securityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'secGroupJenkins',
    });

    // edit SG connections
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH from anywhere');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP from anywhere');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), '8080 from anywhere');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS from anywhere');

    const machineImage = new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 });
    // EC2 instance for Jenkins
    const instance = new ec2.Instance(scope, 'jenkinsEc2Instance', {
      vpc,
      securityGroup,
      keyName: props.keyPairName,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage,
    });

    // install and start Jenkins
    // https://www.jenkins.io/doc/tutorials/tutorial-for-installing-jenkins-on-AWS/
    instance.addUserData('yum update –y');
    instance.addUserData('wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo');
    instance.addUserData('rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key');
    instance.addUserData('yum upgrade');
    instance.addUserData('yum install jenkins java-1.8.0-openjdk-devel -y');
    instance.addUserData('systemctl daemon-reload');
    instance.addUserData('systemctl start jenkins');
    instance.addUserData('systemctl status jenkins');

    // Reverse proxy - iptables
    // https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-iptables/
    instance.addUserData('iptables -I INPUT 1 -p tcp --dport 8443 -j ACCEPT');
    instance.addUserData('iptables -I INPUT 1 -p tcp --dport 8080 -j ACCEPT');
    instance.addUserData('iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT');
    instance.addUserData('iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT');
    instance.addUserData('iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j REDIRECT --to-port 8080');
    instance.addUserData('sudo iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 443 -j REDIRECT --to-port 8443');

    // taken from https://plugins.jenkins.io/ec2/
    const ec2PolicyJson = {
      Sid: 'Stmt1312295543082',
      Action: [
        'ec2:DescribeSpotInstanceRequests',
        'ec2:CancelSpotInstanceRequests',
        'ec2:GetConsoleOutput',
        'ec2:RequestSpotInstances',
        'ec2:RunInstances',
        'ec2:StartInstances',
        'ec2:StopInstances',
        'ec2:TerminateInstances',
        'ec2:CreateTags',
        'ec2:DeleteTags',
        'ec2:DescribeInstances',
        'ec2:DescribeKeyPairs',
        'ec2:DescribeRegions',
        'ec2:DescribeImages',
        'ec2:DescribeAvailabilityZones',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeSubnets',
        'iam:ListInstanceProfilesForRole',
        'iam:PassRole',
        'ec2:GetPasswordData',
      ],
      Effect: 'Allow',
      Resource: '*',
    };

    const ec2PolicyStatement = iam.PolicyStatement.fromJson(ec2PolicyJson);

    // add statement to instance policy
    instance.addToRolePolicy(ec2PolicyStatement);

    const JENKINS_AGENT_SG_NAME = 'jenkins_agent_sg';

    // create security group for jenkins agent
    const jenkinsAgentSG = new ec2.SecurityGroup(scope, 'jenkinsAgentSG', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: JENKINS_AGENT_SG_NAME,
    });
    jenkinsAgentSG.addIngressRule(securityGroup, ec2.Port.tcp(22), 'SSH from Jenkins master');

    /**
     * Outputs -- These values will be used to configure Jenkins
     */
    // SG name needed by Jenkins Cloud config
    // NOTE: jenkinsAgentSG.securityGroupName does not return the same value as JENKINS_AGENT_SG_NAME
    new cdk.CfnOutput(scope, 'jenkinsAgentSGName', { value: JENKINS_AGENT_SG_NAME });

    // these subnets are needed by Jenkins cloud config
    new cdk.CfnOutput(scope, 'subnetIds', { value: vpc.publicSubnets.map(x => x.subnetId).join(' ') });

    // Public DNS for Jenkins master
    new cdk.CfnOutput(scope, 'jenkinsPublicDns', { value: instance.instancePublicDnsName });

    // run this command to get the initialAdminPassword
    // ssh -i "your-key-pair.pem" ec2-user@ec2-12-345-678-910.compute-1.amazonaws.com
    const cmd = `ssh -ti ~/.ssh/${props.keyPairName}.pem ec2-user@${instance.instancePublicDnsName} sudo cat /var/lib/jenkins/secrets/initialAdminPassword`;
    new cdk.CfnOutput(scope, 'jenkinsInitialAdminPassword', { value: cmd });

    // AMI ID needed for setting up a Jenkins Cloud
    new cdk.CfnOutput(scope, 'machineImageId', { value: machineImage.getImage(scope).imageId });
  }
}
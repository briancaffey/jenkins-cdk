import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecrAssets from '@aws-cdk/aws-ecr-assets';
import * as efs from '@aws-cdk/aws-efs';
import * as iam from '@aws-cdk/aws-iam';
import * as route53 from '@aws-cdk/aws-route53';
import * as cdk from '@aws-cdk/core';

const JENKINS_DEFAULT_IMAGE = 'jenkins/jenkins:2.319.1-jdk11';


/**
 * Properties for configuring Jenkins to run on EC2
 */
export interface JenkinsEc2SwarmProps {
  /**
   * Name of the key-pair used to SSH into the Jenkins instance
   */
  readonly keyPairName: string;

  /**
   * Path to custom Jenkins Dockerfile
   *
   * If a value is provided, the Dockerfile will be used to create an image in place of the default Jenkins image
   *
   * The Dockerfile may install some custom plugins or packages that you need in your Jenkins pipelines
   */
  readonly dockerfilePath?: string;

  /**
   * Stack file URI
   *
   * The docker stack file used to setup traefik, Jenkins and dind
   */
  readonly stackFileUri?: string;

  /**
   * Host name for Jenkins server
   */
  readonly hostName: string;

  /**
   * Zone name
   */
  readonly zoneName: string;

}

/**
 * JenkinsEc2 construct for running Jenkins on EC2
 *
 * See project README for instructions on how to configure the plugin in Jenkins UI
 *
 * Designed to use with Jenkins EC2 Plugin
 * See https://plugins.jenkins.io/ec2/ for plugin details
 */
export class JenkinsEc2Swarm extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: JenkinsEc2SwarmProps) {
    super(scope, id);

    const vpc = new ec2.Vpc(scope, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const stack = cdk.Stack.of(scope);

    const stackName = stack.stackName;
    const stackRegion = stack.region;
    const stackId = stack.stackId;
    const accountId = cdk.Stack.of(this).account;

    const instanceResourceName = 'DockerEc2Instance';

    const configSetName = 'application';

    const efsFileSystem = new efs.FileSystem(this, 'EfsFileSystem', {
      vpc,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userDataScript = `
#!/bin/bash -xe
yum update -y aws-cfn-bootstrap # good practice - always do this.
yum update -y
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
echo "nameserver 8.8.4.4" >> /etc/resolv.conf

# mount efs file system to /data
sudo mkdir -p /data/jenkins
sudo mkdir -p /certs/jenkins
sudo mkdir -p /data/traefik

sudo chown -R 1000:1000 /data/jenkins

echo "${efsFileSystem.fileSystemId}.efs.${stackRegion}.amazonaws.com:/ /data nfs defaults,_netdev 0 0" >> /etc/fstab
sudo mount -fav

/opt/aws/bin/cfn-init -v --stack ${stackId} --resource ${instanceResourceName} --configsets ${configSetName} --region ${stackRegion}
/opt/aws/bin/cfn-signal -e $? --stack ${stackId} --resource ${instanceResourceName} --region ${stackRegion}
/opt/aws/bin/cfn-hup
`;

    const userData = ec2.UserData.custom(userDataScript);

    const config = new ec2.InitConfig([]);
    const init = ec2.CloudFormationInit.fromConfig(config);

    const contentStringCfnAutoReloader = `
[cfn-auto-reloader-hook]
triggers=post.update
path=Resources.${instanceResourceName}.Metadata.AWS::CloudFormation::Init
action=/opt/aws/bin/cfn-init -v --stack ${stackName} --resource ${instanceResourceName} --region ${stackRegion}
`;
    const contentStringCfnHup = `
[main]
stack=${stackId}
region=${stackRegion}
verbose=true
interval=5
`;

    /**
     * This is the backend container that will be used to run the backend Django application
     */
    let jenkinsImage = null;
    if (props.dockerfilePath) {
      jenkinsImage = new ecrAssets.DockerImageAsset(this, 'BackendImage', {
        directory: props.dockerfilePath,
      });
    };

    init.addConfig('configure-cfn', new ec2.InitConfig([
      ec2.InitFile.fromString('/etc/cfn/hooks.d/cfn-auto-reloader.conf', contentStringCfnAutoReloader, {
        mode: '000400',
        owner: 'root',
        group: 'root',
      }),
      ec2.InitFile.fromString('/etc/cfn/cfn-hup.conf', contentStringCfnHup, {
        mode: '000400',
        owner: 'root',
        group: 'root',
      }),
    ]));

    init.addConfig('install_docker', new ec2.InitConfig([
      ec2.InitPackage.yum('docker'),
      ec2.InitService.enable('docker'),
      ec2.InitCommand.shellCommand('usermod -a -G docker ec2-user', { key: 'docker_for_ec2_user' }),
    ]));

    const stackFile = props.stackFileUri ?? 'https://raw.githubusercontent.com/briancaffey/jenkins-cdk/refactor-docker/src/jenkins-ec2-swarm/stack.yml';
    const contentStringInstallApplication = `
#!/bin/bash

# download the stack.yml file
curl ${stackFile} -o stack.yml

# export environment variables for docker stack deploy command
export JENKINS_IMAGE=${jenkinsImage ? jenkinsImage.imageUri : JENKINS_DEFAULT_IMAGE}
export JENKINS_HOSTNAME=${props.hostName}

docker swarm init
docker network create --driver=overlay --attachable traefik-public

# login to ecr - needed for custom jenkins images
aws ecr get-login-password --region ${stackRegion} | docker login --username AWS --password-stdin ${accountId}.dkr.ecr.${stackRegion}.amazonaws.com

# deploy docker stack
docker stack deploy --with-registry-auth -c stack.yml stack

## docker:dind
docker run \
  --name jenkins-docker \
  --rm \
  --detach \
  --privileged \
  --network traefik-public \
  --network-alias docker \
  --env DOCKER_TLS_CERTDIR=/certs \
  --volume /certs/jenkins:/certs/client \
  --volume /data/jenkins:/var/jenkins_home \
  --publish 2376:2376 \
  docker:dind \
  --storage-driver overlay2

## jenkins
docker run \
  --name jenkins \
  --rm \
  --detach \
  --privileged \
  --network traefik-public \
  --env DOCKER_HOST=tcp://docker:2376 \
  --env DOCKER_CERT_PATH=/certs/client \
  --env DOCKER_TLS_VERIFY=1 \
  --publish 8080:8080 \
  --publish 50000:50000 \
  --volume /data/jenkins:/var/jenkins_home \
  --volume /certs/jenkins:/certs/client:ro \
  --label traefik.enable=true \
  --label traefik.http.routers.jenkins-web.rule=Host(\`${props.hostName}\`) \
  --label traefik.http.routers.jenkins-web.entrypoints=websecure \
  --label traefik.http.routers.jenkins-web.tls.certresolver=letsencryptresolver \
  --label traefik.http.services.jenkins-web.loadbalancer.server.port=8080 \
  $JENKINS_IMAGE
`;

    init.addConfig('install_jenkins_stack', new ec2.InitConfig([
      ec2.InitFile.fromString('/home/ec2-user/application/application.sh', contentStringInstallApplication, {
        mode: '000400',
        owner: 'root',
        group: 'root',
      }),
      ec2.InitCommand.shellCommand('sudo sh application.sh', {
        cwd: '/home/ec2-user/application',
        key: 'run_docker_docker_stack_deploy',
      }),
    ]));

    init.addConfigSet('application', [
      'configure-cfn',
      'install_docker',
      'install_jenkins_stack',
    ]);

    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow SSH and HTTP access',
      securityGroupName: 'DockerEc2SecurityGroup',
      allowAllOutbound: true,
    });

    // allow SSH access to the ec2SecurityGroup
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP access');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS access');

    efsFileSystem.connections.allowFrom(ec2SecurityGroup, ec2.Port.tcp(2049), 'Allow EFS access');

    const instance = new ec2.Instance(this, instanceResourceName, {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      keyName: props.keyPairName,
      securityGroup: ec2SecurityGroup,
      userData,
      init,
      initOptions: {
        configSets: ['application'],
        timeout: cdk.Duration.minutes(10),
        includeUrl: true,
      },
    });

    // add AmazonEC2ContainerRegistryReadOnly role to the instance
    instance.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
    );

    // allow the ec2 instance to access the custom jenkins image in ecr
    if (!!jenkinsImage) {
      jenkinsImage.repository.grantPull(instance.role);
    };

    /**
     * Route 53 - Hosted Zone
     */
    const hostedZone = route53.HostedZone.fromLookup(scope, 'hosted-zone', {
      domainName: props.zoneName,
    });

    /**
     * Route 53 A Record
     */
    new route53.ARecord(this, 'ARecordJenkins', {
      zone: hostedZone,
      recordName: props.hostName,
      target: route53.RecordTarget.fromIpAddresses(instance.instancePublicIp),
    });

    // Use this command to SSH to the machine
    new cdk.CfnOutput(this, 'Ec2InstanceSshCommand', {
      description: 'Use this command to SSH to the machine',
      value: `ssh -i "~/.ssh/${props.keyPairName}.pem" ec2-user@${instance.instancePublicDnsName}`,
    });

    // jenkins hostname
    new cdk.CfnOutput(this, 'JenkinsHostName', {
      value: props.hostName,
      exportName: 'JenkinsHostName',
    });

    // jenkins url
    new cdk.CfnOutput(this, 'JenkinsUrl', {
      value: `https://${props.hostName}`,
      exportName: 'JenkinsUrl',
    });

    // jenkins admin password
    new cdk.CfnOutput(this, 'JenkinsAdminPassword', {
      value: `ssh -i "~/.ssh/${props.keyPairName}.pem" ec2-user@${instance.instancePublicDnsName} docker exec $(docker ps -q --filter "label=com.docker.swarm.service.name=stack_jenkins") cat /var/jenkins_home/secrets/initialAdminPassword`,
      exportName: 'JenkinsAdminPassword',
    });
  }
}
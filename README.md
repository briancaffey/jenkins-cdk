# CDK Construct Library for setting up Jenkins on AWS

This project deploys AWS infrastructure for running Jenkins on AWS with:

- EC2 (complete)
- ECS (planned)
- EKS (planned)

## EC2

To run Jenkins on EC2, this project follows along with the official tutorial for installing Jenkins on AWS: [https://www.jenkins.io/doc/tutorials/tutorial-for-installing-jenkins-on-AWS/](https://www.jenkins.io/doc/tutorials/tutorial-for-installing-jenkins-on-AWS/).

### Infrastructure

The key parts of infrastructure in the `JenkinsEc2` construct are:

- VPC (only public subnets)
- Security Group for Jenkins primary node
- EC2 instance for Jenkins primary node (installs Jenkins in UserData)
- Security Group for Jenkins agents
- Ouputs needed for configuring the Jenksins EC2 plug-in

### EC2 Plugin Configuration

This constructs starts one EC2 instance that will serve as the Jenkins master node. For security reasons, Jenkins jobs will not run on this node. We can configure a cloud using the Jenkins EC2 plugin. This will spin up EC2 instances to process Jenkins jobs and remove them when there are no longer jobs to process.

Here are the steps needed to use the plugin:

1. Install the EC2 Plugin

Go to Manage Jenkins > Manage Nodes and Cloud > Configure Clouds. Select `Add a new cloud` and the select `Amazon EC2`.

- Add a name such as `AWS Cloud`
- Amazon EC2 Credentials are not needed
- Check the box for `Use EC2 instance profile to obtain credentials`
- You should see the `Region` dropdown populate with AWS Regions. If you don't see options in this list then you probably do not have IAM permissions configured correctly. Select the same Region in which you have deployed the Jenkins master node.
- For `EC2 Key Pair's Private Key`, Select Add > Jenkins to add a new Jenkins Credentials Provider.
    - For `Kind`, select `SSH Username with private key`
    - For `Scope`, select `Global`
    - Add an ID, Description and Username, these values can be whatever you choose.
    - For `Private Key`, select `Enter Directly` and then enter the contents of `<your-key-pair>.pem`.
    - Do not add a passphrase
- Click on `Test Connection` and you should see a message that says `Success`

Next, configure AMIs. This section will use values from the output of our CloudForamtion stack, so navigate to the `Outputs` tab of the stack that you deployed and get ready to copy these values into the Jenkins UI.

- Add a `Description`
- Add the `machineImageId` Output value
- Don't make any changes to `AMI Owners`, `AMI Users` or `AMI Filters`.
- For `Instance Type`, select the instance type you want. `T2Micro` is a good option to start with for testing.
- Leave `Availability Zones` empty
- For `Security group names`, there might be some confusion here. The `jenkinsAgentSGName` Output value references the `jenkinsAgentSG.securityGroupName` in the CDK script, but this is not the same value that is passed to `jenkinsAgentSG`.

```typescript
    // create security group for jenkins agent
    const jenkinsAgentSG = new ec2.SecurityGroup(scope, 'jenkinsAgentSG', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'jenkins_agent_sg',
    });
```

For the `Security group names` option, you need to add the same string used in `SecurityGroupProps`, `jenkins_agent_sg` in this case.
- For `Remote FS root`, enter `/home/ec2-user`
- For `Remote user`, enter `ec2-user`
- For `AMI Type`, I'm not sure if these setting are necessary. I have used `unix`, with `sudo` for `Root command prefix` and `22` for `Remote ssh port` with the other values left blank.

- For `Labels` enter `ec2` or some other Label that you will use when configuring your Jenkins jobs.
- For `Usage`, select `Only build jobs with label expressions matching this node`
- For `Idle termination time`, enter the amount of time an agent should idle before it is automatically shut down.

- Add the space-separated subnet IDs from the Output to the `Subnet IDs for VPC`

- If you want a minimum number of instances, set `Minimum number of instances` to some value.
- Select `Associate Public IP`
- Select `Connect by SSH Process`
- Change `Host Key Verification Strategy` to `accept-new`

- Go to Dashboard > Nodes > master
- Set `Number of executors` to `0`, the master node should not be used to run any Jenkins jobs

- Click `Apply` and then `Save`.

Next, we will set up a simple job that will trigger the creation of an EC2 instance. Select `New Item`, then enter a name, select `Freestyle project` and then click `OK`.

- Click on `Configure`
- Under the `General` tab, select `Restrict where this project can be run`, and enter the same label that you used previously when setting up the EC2 Cloud plugin. You should see a message that says something like this (I set `ec2` as the label vaue):

```
Label ec2 matches no nodes and 1 cloud. Permissions or other restrictions provided by plugins may further reduce that list.
```

In the `Build` step, select `Add build step` > `Execute shell` and in the command, add something trivial such as:

```
echo "Running..."
sleep 10
echo "Done!"
```

- Click `Apply` and `Save`
- Click on `Build Now`

You should see the follow on the bottom left of the Jenkins UI:

```
#1

(pending—Waiting for next available executor)
```

In the AWS Console on the EC2 Instances page you should see a new EC2 instance initializing. This indicates that a new machine is coming online to process the job that was just requested.

## Reverse proxy - iptables

[https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-iptables/](https://www.jenkins.io/doc/book/system-administration/reverse-proxy-configuration-iptables/)


## Resources

[https://www.youtube.com/watch?v=dAa3u39RYpM](https://www.youtube.com/watch?v=dAa3u39RYpM) - [ AWS 23 ] Launch AWS EC2 instances as Jenkins Slaves using EC2 plugin

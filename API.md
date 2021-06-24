# API Reference

**Classes**

Name|Description
----|-----------
[JenkinsEc2](#jenkins-cdk-jenkinsec2)|JenkinsEc2 construct for running Jenkins on EC2.


**Structs**

Name|Description
----|-----------
[JenkinsCdnProps](#jenkins-cdk-jenkinscdnprops)|Options for serving Jenkins over a CloudFront Distribution.
[JenkinsEc2Props](#jenkins-cdk-jenkinsec2props)|Properties for configuring Jenkins to run on EC2.



## class JenkinsEc2  <a id="jenkins-cdk-jenkinsec2"></a>

JenkinsEc2 construct for running Jenkins on EC2.

See project README for instructions on how to configure the plugin in Jenkins UI

Designed to use with Jenkins EC2 Plugin
See https://plugins.jenkins.io/ec2/ for plugin details

__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new JenkinsEc2(scope: Construct, id: string, props: JenkinsEc2Props)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[JenkinsEc2Props](#jenkins-cdk-jenkinsec2props)</code>)  *No description*
  * **keyPairName** (<code>string</code>)  Name of the key-pair used to SSH into the Jenkins instance. 
  * **jenkinsCdnProps** (<code>[JenkinsCdnProps](#jenkins-cdk-jenkinscdnprops)</code>)  Options for configuring a CDN that will point to Jenkins. __*Optional*__




## struct JenkinsCdnProps  <a id="jenkins-cdk-jenkinscdnprops"></a>


Options for serving Jenkins over a CloudFront Distribution.



Name | Type | Description 
-----|------|-------------
**domainName** | <code>string</code> | Domain name for backend (including sub-domain).
**hostedZoneName** | <code>string</code> | HostedZoneName.
**certificateArn**? | <code>string</code> | Certificate ARN.<br/>__*Optional*__



## struct JenkinsEc2Props  <a id="jenkins-cdk-jenkinsec2props"></a>


Properties for configuring Jenkins to run on EC2.



Name | Type | Description 
-----|------|-------------
**keyPairName** | <code>string</code> | Name of the key-pair used to SSH into the Jenkins instance.
**jenkinsCdnProps**? | <code>[JenkinsCdnProps](#jenkins-cdk-jenkinscdnprops)</code> | Options for configuring a CDN that will point to Jenkins.<br/>__*Optional*__




# Makefile commands for local development

## -- ec2 Targets --

## synthesize ec2 project
ec2-synth:
	cdk synth --app='./lib/integ.ec2-jenkins.js'

## deploy ec2 project
ec2-deploy:
	cdk deploy --app='./lib/integ.ec2-jenkins.js'

## destroy ec2 project
ec2-destroy:
	cdk destroy --app='./lib/integ.ec2-jenkins.js'

## diff ec2 project
ec2-diff:
	cdk diff --app='./lib/integ.ec2-jenkins.js'

## -- ec2 swarm Targets --

## jenkins ec2 swarm synth
jenkins-ec2-swarm-synth:
	cdk synth --app='./lib/integ.jenkins-ec2-swarm.js'

## jenkins ec2 swarm deploy
jenkins-ec2-swarm-deploy:
	cdk deploy --app='./lib/integ.jenkins-ec2-swarm.js'

## jenkins ec2 swarm destroy
jenkins-ec2-swarm-destroy:
	cdk destroy --app='./lib/integ.jenkins-ec2-swarm.js'

## jenknis ec2 swarm diff
jenkins-ec2-swarm-diff:
	cdk diff --app='./lib/integ.jenkins-ec2-swarm.js'
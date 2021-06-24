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
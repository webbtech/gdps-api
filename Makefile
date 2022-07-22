# The KEY environment variable must be set to either stage or prod
# KEY is confirmed below in the check_env directive
# example:
# stage: ENV=stage make
# production: ENV=prod make

include .env

default: check_env compileapp awspackage awsdeploy

deploy: check_env buildapp awspackage awsdeploy

check_env:
	@echo -n "Your environment is $(ENV)? [y/N] " && read ans && [ $${ans:-N} = y ]

buildapp:
	@rm -fr build/* && \
	yarn run build && \
	cp package.json build/ && \
	cd ./build && \
	rm server.dev.js && \
	yarn install --prod

compileapp:
	yarn run build

run: compileapp
	sam local start-api

# sam local start-api -n env.json
# sam local start-api -n env.json --profile $(AWS_PROFILE)
# sam local start-api -n env.json  --log-file ./output.log

run-graph:
	sam local invoke --env-vars env.json "GraphQLInspector"

awspackage:
	@aws cloudformation package \
   --template-file ${FILE_TEMPLATE} \
   --output-template-file ${FILE_PACKAGE} \
   --s3-bucket $(AWS_BUCKET_NAME) \
   --s3-prefix $(AWS_BUCKET_PREFIX) \
   --profile $(AWS_PROFILE)

awsdeploy:
	@aws cloudformation deploy \
   	--template-file ${FILE_PACKAGE} \
   	--stack-name $(AWS_STACK_NAME) \
   	--capabilities CAPABILITY_NAMED_IAM \
   	--profile $(AWS_PROFILE) \
	--parameter-overrides \
		ParamCertificateArn=$(CERTIFICATE_ARN) \
		ParamCustomDomainName=$(CUSTOM_DOMAIN_NAME) \
		ParamENV=$(ENV) \
		ParamHostedZoneId=$(HOSTED_ZONE_ID) \
	 	ParamAccountId=$(AWS_ACCOUNT_ID) \
	 	ParamProjectName=$(AWS_STACK_NAME) \
		ParamUserPoolArn=$(USER_POOL_ARN)

describe:
	@aws cloudformation describe-stacks \
		--region $(AWS_REGION) \
		--stack-name $(AWS_STACK_NAME)

outputs:
	@ make describe \
		| jq -r '.Stacks[0].Outputs'

.PHONY:  awspackage awsdeploy buildapp check_env compileapp configure describe default deploy outputs run validate
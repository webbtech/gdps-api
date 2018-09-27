include .env

default: compileapp awsPackage awsDeploy

deploy: buildapp awsPackage awsDeploy

buildapp:
	@rm -fr build/* && \
	yarn run build && \
	cp ./src/auth/jwk.json build/auth/ && \
	cp package.json build/ && \
	cd ./build && \
	rm server.dev.js
	yarn install --prod && \
	find . -mtime +10950 -print -exec touch {} \;

compileapp:
	yarn run build

run: compileapp
	sam local start-api

# sam local start-api -n env.json
# sam local start-api -n env.json --profile $(AWS_PROFILE)
# sam local start-api -n env.json  --log-file ./output.log

run-graph:
	sam local invoke --env-vars env.json "GraphQLInspector"

awsPackage:
	@aws cloudformation package \
   --template-file template.yaml \
   --output-template-file packaged-tpl.yaml \
   --s3-bucket $(AWS_BUCKET_NAME) \
   --s3-prefix $(AWS_BUCKET_PREFIX) \
   --profile $(AWS_PROFILE)

awsDeploy:
	@aws cloudformation deploy \
   --template-file packaged-tpl.yaml \
   --stack-name $(AWS_STACK_NAME) \
   --capabilities CAPABILITY_IAM \
   --profile $(AWS_PROFILE)

describe:
	@aws cloudformation describe-stacks \
		--region $(AWS_REGION) \
		--stack-name $(AWS_STACK_NAME)

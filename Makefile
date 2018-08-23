include .env

default: compileapp package deploy

fulldeploy: buildapp package deploy

buildapp:
	rm -fr build/* && \
	yarn run build && \
	cp ./src/auth/jwk.json build/auth/ && \
	cp package.json build/ && \
	cd ./build && \
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

package:
	aws cloudformation package \
   --template-file template.yaml \
   --output-template-file packaged-template.yaml \
   --s3-bucket $(AWS_BUCKET_NAME) \
   --s3-prefix lambda \
   --profile $(AWS_PROFILE)

# sam package --template-file template.yaml --s3-bucket $(AWS_BUCKET_NAME) \
# --s3-prefix lambda --output-template-file packaged-template.yaml --profile $(AWS_PROFILE)

deploy:
	aws cloudformation deploy \
   --template-file packaged-template.yaml \
   --stack-name $(AWS_STACK_NAME) \
   --capabilities CAPABILITY_IAM \
   --profile $(AWS_PROFILE)

#sam deploy --template-file packaged-template.yaml --stack-name $(AWS_STACK_NAME) \
#	--capabilities CAPABILITY_IAM --profile $(AWS_PROFILE)

describe:
	@aws cloudformation describe-stacks \
		--region $(AWS_REGION) \
		--stack-name $(AWS_STACK_NAME)

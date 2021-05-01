#!/bin/bash

set -eu

if [[ -e sources.zip ]]; then
    rm sources.zip
fi

echo "Packaging sources"
zip --quiet --exclude 'app/build/*' -r sources.zip app gradlew gradle build.gradle settings.gradle gradle.properties buildspec.yaml

pipeline_stack_name="${PREFIX}device-farm-demo-cdk-pipeline"
source_bucket=$(aws cloudformation describe-stacks \
    --output text \
    --stack-name ${pipeline_stack_name} \
    --query 'Stacks[0].Outputs[?OutputKey==`SourceBucket`].OutputValue')

echo "Pushing sources to ${source_bucket}"
aws s3 cp sources.zip s3://${source_bucket}/sources.zip

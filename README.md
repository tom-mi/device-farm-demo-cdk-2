# device-farm-demo-cdk-2

Demo containing
* custom resources to create AWS Device farm projects & device pools implemented with the [Custom Resources for AWS APIs](https://docs.aws.amazon.com/cdk/api/latest/docs/custom-resources-readme.html#custom-resources-for-aws-apis)
* pipeline building & running a Device Farm example project
* infrastructure deployed via CDK

## Deploy pipeline & custom resources

```
pushd infrastructure
yarn
yarn cdk deploy --all
popd
```

## Push sources to trigger pipeline

```
./push_sources.sh
```

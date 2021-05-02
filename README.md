# device-farm-demo-cdk

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


import { CfnOutput, Construct, Fn, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, S3SourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Bucket } from '@aws-cdk/aws-s3';
import { ComputeType, LinuxBuildImage, PipelineProject } from '@aws-cdk/aws-codebuild';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId, PhysicalResourceIdReference } from '@aws-cdk/custom-resources';
import { DeviceFarmAction } from './device-farm-action';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // define resources here...
    const project = new AwsCustomResource(this, 'DeviceFarmProject', {
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
      onCreate: {
        service: 'DeviceFarm',
        action: 'createProject',
        region: 'us-west-2',
        parameters: { name: 'device-farm-demo-2' },
        physicalResourceId: PhysicalResourceId.fromResponse('project.arn'),
      },
      onDelete: {
        service: 'DeviceFarm',
        action: 'deleteProject',
        region: 'us-west-2',
        parameters: { arn: new PhysicalResourceIdReference() },
      },
    });
    const devicePool = new AwsCustomResource(this, 'DeviceFarmPool', {
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: AwsCustomResourcePolicy.ANY_RESOURCE }),
      onCreate: {
        service: 'DeviceFarm',
        action: 'createDevicePool',
        region: 'us-west-2',
        parameters: {
          name: 'device-farm-demo-pool-2',
          projectArn: project.getResponseField('project.arn'),
          rules: [{
            attribute: 'MODEL',
            operator: 'EQUALS',
            value: '"Google Pixel 2"',
          }],
        },
        physicalResourceId: PhysicalResourceId.fromResponse('devicePool.arn'),
      },
      onDelete: {
        service: 'DeviceFarm',
        action: 'deleteDevicePool',
        region: 'us-west-2',
        parameters: { arn: new PhysicalResourceIdReference() },
      },
    });

    const source = new Bucket(this, 'Bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
    });
    const sourceArtifact = new Artifact();
    const buildArtifact = new Artifact();

    const pipeline = new Pipeline(this, 'Pipeline', {});
    pipeline.addStage({
      stageName: 'Source',
      actions: [new S3SourceAction({
        actionName: 'S3Source',
        bucket: source,
        bucketKey: 'sources.zip',
        output: sourceArtifact,
      })],
    });
    pipeline.addStage({
      stageName: 'Build',
      actions: [new CodeBuildAction({
        actionName: 'GradleBuild',
        input: sourceArtifact,
        project: new PipelineProject(this, 'GradleBuildProject', {
          environment: {
            buildImage: LinuxBuildImage.AMAZON_LINUX_2_3,
            computeType: ComputeType.LARGE,
          },
        }),
        outputs: [buildArtifact],
      })],
    });
    pipeline.addStage({
      stageName: 'Test',
      actions: [new DeviceFarmAction({
        actionName: 'DeviceFarmTest',
        inputs: [buildArtifact],
        app: 'app-release-unsigned.apk',
        appType: 'Android',
        devicePoolArn: devicePool.getResponseField('devicePool.arn'),
        projectId: Fn.select(6, Fn.split(':', project.getResponseField('project.arn'))),
        radioBluetoothEnabled: true,
        radioGpsEnabled: true,
        radioNfcEnabled: true,
        radioWifiEnabled: true,
        recordAppPerformanceData: true,
        recordVideo: true,
        test: 'app-debug-androidTest.apk',
        testType: 'Instrumentation',
      })],
    });

    new CfnOutput(this, 'SourceBucket', {
      value: source.bucketName,
    });
  }
}

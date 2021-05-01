import { CfnOutput, Construct, CustomResource, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { Artifact, Pipeline } from '@aws-cdk/aws-codepipeline';
import { CodeBuildAction, S3SourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Bucket } from '@aws-cdk/aws-s3';
import { ComputeType, LinuxBuildImage, PipelineProject } from '@aws-cdk/aws-codebuild';
import { DeviceFarmAction } from './device-farm-action';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

interface PipelineStackProps {
  projectCustomResourceServiceToken: string
  devicePoolCustomResourceServiceToken: string
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps & PipelineStackProps) {
    super(scope, id, props);

    // define resources here...
    const project = new CustomResource(this, 'DeviceFarmProject', {
      serviceToken: props.projectCustomResourceServiceToken,
      properties: {
        ProjectName: 'device-farm-demo',
      },
    });
    const devicePool = new CustomResource(this, 'DeviceFarmPool', {
      serviceToken: props.devicePoolCustomResourceServiceToken,
      properties: {
        ProjectArn: project.getAttString('Arn'),
        Name: 'device-farm-demo-pool',
        Rules: [{
          attribute: 'MODEL',
          operator: 'EQUALS',
          value: '"Google Pixel 2"',
        }],
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
        devicePoolArn: devicePool.getAttString('Arn'),
        projectId: project.getAttString('ProjectId'),
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

    pipeline.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'devicefarm:CreateUpload',
        'devicefarm:GetRun',
        'devicefarm:GetUpload',
        'devicefarm:ListDevicePools',
        'devicefarm:ListProjects',
        'devicefarm:ScheduleRun',
      ],
      resources: ['*'],
    }));

    new CfnOutput(this, 'SourceBucket', {
      value: source.bucketName,
    });
  }
}

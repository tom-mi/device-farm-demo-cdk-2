import { CfnOutput, Construct, CustomResource, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';
import { ActionArtifactBounds, ActionBindOptions, ActionCategory, ActionConfig, Artifact, IStage, Pipeline } from '@aws-cdk/aws-codepipeline';
import { Action, CodeBuildAction, S3SourceAction } from '@aws-cdk/aws-codepipeline-actions';
import { Bucket } from '@aws-cdk/aws-s3';
import { ComputeType, LinuxBuildImage, PipelineProject } from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';

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

    new CfnOutput(this, 'SourceBucket', {
      value: source.bucketName,
    });
  }
}

interface DeviceFarmActionProps {
  actionName: string,
  readonly inputs: codepipeline.Artifact[];
  recordAppPerformanceData: boolean
  appType: string
  projectId: string
  app: string
  radioBluetoothEnabled: boolean
  recordVideo: boolean
  radioWifiEnabled: boolean
  radioNfcEnabled: boolean
  radioGpsEnabled: boolean
  test: string
  devicePoolArn: string
  testType: string
}

export class DeviceFarmAction extends Action {
  private readonly props: DeviceFarmActionProps;

  constructor(props: DeviceFarmActionProps) {
    super({
      ...props,
      category: ActionCategory.TEST,
      provider: 'DeviceFarm',
      owner: 'AWS',
      artifactBounds: new class implements ActionArtifactBounds {
        readonly minInputs: number = 1;
        readonly maxInputs: number = 1;
        readonly minOutputs: number = 0;
        readonly maxOutputs: number = 0;
      },
      version: '1',
    });

    this.props = props;
  }

  protected bound(_scope: Construct, _stage: IStage, _options: ActionBindOptions): ActionConfig {
    return {
      configuration: {
        RecordAppPerformanceData: this.props.recordAppPerformanceData,
        AppType: this.props.appType,
        ProjectId: this.props.projectId,
        App: this.props.app,
        RadioBluetoothEnabled: this.props.radioBluetoothEnabled,
        RecordVideo: this.props.recordVideo,
        RadioWifiEnabled: this.props.radioWifiEnabled,
        RadioNfcEnabled: this.props.radioNfcEnabled,
        RadioGpsEnabled: this.props.radioGpsEnabled,
        Test: this.props.test,
        DevicePoolArn: this.props.devicePoolArn,
        TestType: this.props.testType,
      },
    };
  }
}

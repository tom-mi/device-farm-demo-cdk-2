import * as codepipeline from '@aws-cdk/aws-codepipeline';
import { Action } from '@aws-cdk/aws-codepipeline-actions';
import { ActionArtifactBounds, ActionBindOptions, ActionCategory, ActionConfig, IStage } from '@aws-cdk/aws-codepipeline';
import { Construct } from '@aws-cdk/core';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

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

  protected bound(_scope: Construct, _stage: IStage, options: ActionBindOptions): ActionConfig {
    options.role.addToPrincipalPolicy(new PolicyStatement({
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
    options.bucket.grantRead(options.role)
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

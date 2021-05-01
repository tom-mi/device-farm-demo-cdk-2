import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { Provider } from '@aws-cdk/custom-resources';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

export class DeviceFarmResources extends Stack {
  readonly projectCustomResourceServiceToken: string;
  readonly devicePoolCustomResourceServiceToken: string;

  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
    const projectHandler = new Function(this, 'ProjectHandler', {
      code: Code.fromAsset('../device-farm-resources-lambda/src'),
      handler: 'project_resource.lambda_handler',
      runtime: Runtime.PYTHON_3_8,
    });
    projectHandler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'devicefarm:CreateProject',
        'devicefarm:UpdateProject',
        'devicefarm:DeleteProject',
        'devicefarm:ListDevicePools',
      ],
      resources: ['*'],
    }))

    const projectResourceProvider = new Provider(this, 'ProjectProvider', {
      onEventHandler: projectHandler,
      logRetention: RetentionDays.ONE_WEEK,
    });

    const devicePoolHandler = new Function(this, 'DevicePoolHandler', {
      code: Code.fromAsset('../device-farm-resources-lambda/src'),
      handler: 'device_pool_resource.lambda_handler',
      runtime: Runtime.PYTHON_3_8,
    });
    devicePoolHandler.addToRolePolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'devicefarm:ListDevicePools',
        'devicefarm:CreateDevicePool',
        'devicefarm:UpdateDevicePool',
        'devicefarm:DeleteDevicePool',
      ],
      resources: ['*'],
    }))

    const devicePoolResourceProvider = new Provider(this, 'DevicePoolProvider', {
      onEventHandler: devicePoolHandler,
      logRetention: RetentionDays.ONE_WEEK,
    });

    this.projectCustomResourceServiceToken = projectResourceProvider.serviceToken;
    this.devicePoolCustomResourceServiceToken = devicePoolResourceProvider.serviceToken;
  }
}

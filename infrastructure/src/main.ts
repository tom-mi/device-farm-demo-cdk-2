import { App } from '@aws-cdk/core';
import { DeviceFarmResources } from './device-farm-resources';
import { PipelineStack } from './pipeline';

const app = new App();
const prefix = process.env.PREFIX || ''
const resources = new DeviceFarmResources(app, `${prefix}device-farm-demo-cdk-resources`)
new PipelineStack(app, `${prefix}device-farm-demo-cdk-pipeline`, {
  projectCustomResourceServiceToken: resources.projectCustomResourceServiceToken,
  devicePoolCustomResourceServiceToken: resources.devicePoolCustomResourceServiceToken,
})

app.synth();

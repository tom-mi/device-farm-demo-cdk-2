import { App } from '@aws-cdk/core';
import { PipelineStack } from './pipeline';

const app = new App();
const prefix = process.env.PREFIX || ''
new PipelineStack(app, `${prefix}device-farm-demo-cdk-2-pipeline`, {})

app.synth();

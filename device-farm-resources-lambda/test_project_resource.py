from datetime import datetime

import pytest
from unittest.mock import MagicMock

from src import project_resource

TEST_PROJECT_NAME = 'project-name'
TEST_RESPONSE_URL = 'http://example.com/response'
TEST_PHYSICAL_RESOURCE_ID = 'arn:aws:devicefarm:us-west-2:account-id:project:12345'
TEST_PROJECT_ID = '12345'
TEST_TOP_DEVICES_ARN = 'arn:top-devices'


@pytest.fixture
def context():
    mock = MagicMock()
    mock.log_stream_name = 'stream'
    return mock


@pytest.fixture
def device_farm_endpoint(monkeypatch):
    mock = MagicMock()
    monkeypatch.setattr('boto3.client', MagicMock(return_value=mock))
    mock.create_project = MagicMock(return_value={
        'project': {
            'arn': TEST_PHYSICAL_RESOURCE_ID,
            'name': TEST_PROJECT_NAME,
            'defaultJobTimeoutMinutes': 123,
            'created': datetime.now(),
        },
    })
    device_pools_iterator = [{
        'devicePools': [
            {
                'arn': 'arn:other',
                'name': 'Flop Devices',
                'type': 'CURATED',
            }, ],
    }, {
        'devicePools': [
            {
                'arn': TEST_TOP_DEVICES_ARN,
                'name': 'Top Devices',
                'type': 'CURATED',
            }, ],
    }]
    paginator_mock = MagicMock()
    paginator_mock.paginate = MagicMock(return_value=device_pools_iterator)
    mock.get_paginator = MagicMock(return_value=paginator_mock)
    return mock


def test_handler_create_missing_parameter(context, device_farm_endpoint):
    event = {
        'RequestType': 'Create',
        'LogicalResourceId': 'DeviceFarm',
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
        }
    }

    with pytest.raises(Exception):
        project_resource.lambda_handler(event, context)

    device_farm_endpoint.create_project.assert_not_called()
    device_farm_endpoint.update_project.assert_not_called()


def test_handler_create_extra_parameter(context, device_farm_endpoint):
    event = {
        'RequestType': 'Create',
        'LogicalResourceId': 'DeviceFarm',
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
            'Foo': 'Bar',
        }
    }

    with pytest.raises(Exception):
        project_resource.lambda_handler(event, context)

    device_farm_endpoint.create_project.assert_not_called()
    device_farm_endpoint.update_project.assert_not_called()


def test_handler_create(context, device_farm_endpoint):
    event = {
        'RequestType': 'Create',
        'LogicalResourceId': 'DeviceFarm',
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
        }
    }

    result = project_resource.lambda_handler(event, context)

    assert result['PhysicalResourceId'] == TEST_PHYSICAL_RESOURCE_ID
    assert result['Data']['Arn'] == TEST_PHYSICAL_RESOURCE_ID
    assert result['Data']['ProjectId'] == TEST_PROJECT_ID
    assert result['Data']['TopDevicesDevicePoolArn'] == TEST_TOP_DEVICES_ARN
    device_farm_endpoint.create_project.assert_called_with(name=TEST_PROJECT_NAME)
    device_farm_endpoint.update_project.assert_not_called()
    device_farm_endpoint.get_paginator.assert_called_with('list_device_pools')
    device_farm_endpoint.get_paginator().paginate.assert_called_with(arn=TEST_PHYSICAL_RESOURCE_ID, type='CURATED')


def test_handler_create_fails(context, device_farm_endpoint):
    event = {
        'RequestType': 'Create',
        'LogicalResourceId': 'DeviceFarm',
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
        }
    }
    device_farm_endpoint.create_project = MagicMock(side_effect=Exception('This went wrong'))

    with pytest.raises(Exception):
        project_resource.lambda_handler(event, context)

    device_farm_endpoint.create_project.assert_called_with(name=TEST_PROJECT_NAME)
    device_farm_endpoint.update_project.assert_not_called()


def test_handler_update(context, device_farm_endpoint):
    event = {
        'RequestType': 'Update',
        'LogicalResourceId': 'DeviceFarm',
        'PhysicalResourceId': TEST_PHYSICAL_RESOURCE_ID,
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
        }
    }

    result = project_resource.lambda_handler(event, context)

    assert result['PhysicalResourceId'] == TEST_PHYSICAL_RESOURCE_ID
    assert result['Data']['Arn'] == TEST_PHYSICAL_RESOURCE_ID
    assert result['Data']['ProjectId'] == TEST_PROJECT_ID
    assert result['Data']['TopDevicesDevicePoolArn'] == TEST_TOP_DEVICES_ARN
    device_farm_endpoint.create_project.assert_not_called()
    device_farm_endpoint.update_project.assert_called_with(arn=TEST_PHYSICAL_RESOURCE_ID, name=TEST_PROJECT_NAME)
    device_farm_endpoint.get_paginator.assert_called_with('list_device_pools')
    device_farm_endpoint.get_paginator().paginate.assert_called_with(arn=TEST_PHYSICAL_RESOURCE_ID, type='CURATED')


def test_handler_update_fails(context, device_farm_endpoint):
    event = {
        'RequestType': 'Update',
        'LogicalResourceId': 'DeviceFarm',
        'PhysicalResourceId': TEST_PHYSICAL_RESOURCE_ID,
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
        }
    }
    device_farm_endpoint.update_project = MagicMock(side_effect=Exception('This went wrong'))

    with pytest.raises(Exception):
        project_resource.lambda_handler(event, context)

    device_farm_endpoint.create_project.assert_not_called()
    device_farm_endpoint.update_project.assert_called_with(arn=TEST_PHYSICAL_RESOURCE_ID, name=TEST_PROJECT_NAME)


def test_handler_delete(context, device_farm_endpoint):
    event = {
        'RequestType': 'Delete',
        'LogicalResourceId': 'DeviceFarm',
        'PhysicalResourceId': TEST_PHYSICAL_RESOURCE_ID,
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
        }
    }

    result = project_resource.lambda_handler(event, context)

    assert result['PhysicalResourceId'] == TEST_PHYSICAL_RESOURCE_ID
    device_farm_endpoint.create_project.assert_not_called()
    device_farm_endpoint.update_project.assert_not_called()
    device_farm_endpoint.delete_project.assert_called_with(arn=TEST_PHYSICAL_RESOURCE_ID)


def test_handler_delete_fails(context, device_farm_endpoint):
    event = {
        'RequestType': 'Delete',
        'LogicalResourceId': 'DeviceFarm',
        'PhysicalResourceId': TEST_PHYSICAL_RESOURCE_ID,
        'RequestId': '1234',
        'ResponseURL': TEST_RESPONSE_URL,
        'StackId': 'arn:aws:cloudformation:us-east-2:namespace:stack/stack-name/guid',
        'ResourceProperties': {
            'ProjectName': TEST_PROJECT_NAME,
        }
    }
    device_farm_endpoint.delete_project = MagicMock(side_effect=Exception('This went wrong'))

    with pytest.raises(Exception):
        project_resource.lambda_handler(event, context)

    device_farm_endpoint.create_project.assert_not_called()
    device_farm_endpoint.update_project.assert_not_called()
    device_farm_endpoint.delete_project.assert_called_with(arn=TEST_PHYSICAL_RESOURCE_ID)

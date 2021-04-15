import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('daysValid', '1');
tmr.setInput('definitionId', '33');
tmr.setInput('protectPipeline', 'true');
tmr.setInput('runId', '120');
tmr.setInput('genericEndpoint', 'AzureRest');

process.env["ENDPOINT_URL_AzureRest"] = '';
process.env["ENDPOINT_AUTH_AzureRest"] = '{"scheme":"UsernamePassword", "parameters": {"username": "", "password": "4yikltn3sfqboqgf2fkgibynnfkoo7xq7pk5kgckboc6r3ottu5a"}}';

tmr.run();
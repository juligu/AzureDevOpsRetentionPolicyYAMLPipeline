"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const fetch = require('node-fetch');
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const daysValidVar = Number(tl.getInput('daysValid', true));
            const protectPipelineVar = tl.getBoolInput('protectPipeline', true);
            const definitionIdVar = Number(tl.getVariable('System.DefinitionId'));
            const runIdVar = Number(tl.getVariable('Build.BuildId'));
            const leaseType = tl.getInput('leaseType', true);
            const maxNumberLeases = Number(tl.getInput('maxNumberLeases', false));
            let password = tl.getVariable('System.AccessToken');
            const orgURL = tl.getVariable('System.CollectionUri');
            const projectName = tl.getVariable('System.TeamProject');
            if (leaseType === 'begin') {
                let results = yield createLease(daysValidVar, definitionIdVar, protectPipelineVar, runIdVar, orgURL, projectName, 'leaseTaskBegin', password);
                console.log('Lease ID: ', results.value[0].leaseId);
            }
            else {
                yield deleteLease(definitionIdVar, runIdVar, orgURL, projectName, 'leaseTaskBegin', password);
                let results = yield createLease(daysValidVar, definitionIdVar, protectPipelineVar, runIdVar, orgURL, projectName, 'leaseTaskEnd', password);
                console.log('Lease ID: ', results.value[0].leaseId);
                yield cleanOldLeases(definitionIdVar, orgURL, projectName, 'leaseTaskEnd', password, results.value[0].leaseId, maxNumberLeases);
            }
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
function deleteLease(definitionIdVar, runIdVar, orgURLVar, projectNameVar, ownerIdVar, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let existingLeaseJson = yield getLease(definitionIdVar, runIdVar, orgURLVar, projectNameVar, ownerIdVar, password);
        let queryLeases = existingLeaseJson;
        if (Number(queryLeases.count) > 0) {
            yield fetch(orgURLVar + projectNameVar + '/_apis/build/retention/leases?ids=' + queryLeases.value[0].leaseId
                + '&api-version=6.0-preview.1', {
                method: 'delete',
                headers: {
                    'Authorization': 'Bearer ' + password,
                    'Content-Type': 'application/json'
                }
            });
        }
        return true;
    });
}
function deleteLeaseByLeaseID(leaseIdVar, orgURLVar, projectNameVar, password) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fetch(orgURLVar + projectNameVar + '/_apis/build/retention/leases?ids=' + leaseIdVar
            + '&api-version=6.0-preview.1', {
            method: 'delete',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            }
        });
        return true;
    });
}
function getLease(definitionIdVar, runIdVar, orgURLVar, projectNameVar, ownerIdVar, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let existingLease = yield fetch(orgURLVar + projectNameVar +
            '/_apis/build/retention/leases?ownerId=' + ownerIdVar + '&definitionId=' + definitionIdVar +
            '&runId=' + runIdVar + '&api-version=6.0-preview.1', {
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            }
        });
        return yield existingLease.json();
    });
}
function cleanOldLeases(definitionIdVar, orgURLVar, projectNameVar, ownerIdVar, password, leaseIdVar, maxNumberLeasesVar) {
    return __awaiter(this, void 0, void 0, function* () {
        let existingLease = yield fetch(orgURLVar + projectNameVar +
            '/_apis/build/retention/leases?ownerId=' + ownerIdVar + '&definitionId=' + definitionIdVar +
            '&api-version=6.0-preview.1', {
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            }
        });
        let leasesJSON = yield existingLease.json();
        let numberLeases = Number(leasesJSON.count);
        let index = 0;
        while (numberLeases > maxNumberLeasesVar) {
            let leaseId = leasesJSON.value[index].leaseId;
            if (leaseId != leaseIdVar) {
                yield deleteLeaseByLeaseID(leaseId, orgURLVar, projectNameVar, password);
            }
            index = index + 1;
            numberLeases = numberLeases - 1;
        }
        return true;
    });
}
function createLease(daysValidVar, definitionIdVar, protectPipelineVar, runIdVar, orgURLVar, projectNameVar, ownerIdVar, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let existingLeaseJson = yield getLease(definitionIdVar, runIdVar, orgURLVar, projectNameVar, ownerIdVar, password);
        let queryLeases = existingLeaseJson;
        if (Number(queryLeases.count) > 0) {
            return existingLeaseJson;
        }
        const response = yield fetch(orgURLVar + projectNameVar + '/_apis/build/retention/leases?api-version=6.0-preview.1', {
            method: 'post',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                    daysValid: daysValidVar,
                    definitionId: definitionIdVar,
                    ownerId: ownerIdVar,
                    protectPipeline: protectPipelineVar,
                    runId: runIdVar
                }])
        });
        const data = yield response.json();
        return data;
    });
}
run();

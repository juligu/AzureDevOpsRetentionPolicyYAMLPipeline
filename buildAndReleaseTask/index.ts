import tl = require('azure-pipelines-task-lib/task');
import { strict } from 'node:assert';
import { url } from 'node:inspector';
const fetch = require('node-fetch');

async function run() {
    try {
        const daysValidVar: number = Number(tl.getInput('daysValid', true));
        const protectPipelineVar: boolean | undefined = tl.getBoolInput('protectPipeline', true);
        const definitionIdVar: number = Number(tl.getVariable('System.DefinitionId'));
        const runIdVar: number = Number(tl.getVariable('Build.BuildId'));
        const leaseType: string  | undefined = tl.getInput('leaseType', true);
        const maxNumberLeases: number = Number(tl.getInput('maxNumberLeases', false));

        let password: string | undefined = tl.getVariable('System.AccessToken');
        const orgURL: string | undefined = tl.getVariable('System.CollectionUri');
        const projectName: string | undefined = tl.getVariable('System.TeamProject');
        

        if (leaseType! === 'begin') {
            let results = await createLease(daysValidVar, definitionIdVar, protectPipelineVar, runIdVar,
                orgURL, projectName, 'leaseTaskBegin', password);
            
            console.log('Lease ID: ', results.value[0].leaseId);
        }
        else {
            await deleteLease(definitionIdVar, runIdVar,
                orgURL, projectName, 'leaseTaskBegin', password);
            
            let results = await createLease(daysValidVar, definitionIdVar, protectPipelineVar, runIdVar,
                orgURL, projectName, 'leaseTaskEnd', password);
            
            console.log('Lease ID: ', results.value[0].leaseId);

            await cleanOldLeases(definitionIdVar, orgURL, projectName, 'leaseTaskEnd', password,
                results.value[0].leaseId, maxNumberLeases);
        }
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }
}

async function deleteLease(definitionIdVar: number, runIdVar: number, orgURLVar: string | undefined,
    projectNameVar: string | undefined, ownerIdVar: string | undefined, password: string | undefined): Promise<Boolean>
{
    let existingLeaseJson = await getLease(definitionIdVar, runIdVar,
        orgURLVar, projectNameVar, ownerIdVar, password);
    let queryLeases = existingLeaseJson as GetLeaseResult;
    
    if (Number(queryLeases.count) > 0)
    {
        await fetch(orgURLVar! + projectNameVar! + '/_apis/build/retention/leases?ids=' + queryLeases.value[0].leaseId
                + '&api-version=6.0-preview.1', {
            method: 'delete',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            }
        });
    }

    return true;
}

async function deleteLeaseByLeaseID(leaseIdVar: number, orgURLVar: string | undefined,
    projectNameVar: string | undefined, password: string | undefined): Promise<Boolean> {

    await fetch(orgURLVar! + projectNameVar! + '/_apis/build/retention/leases?ids=' + leaseIdVar
            + '&api-version=6.0-preview.1', {
        method: 'delete',
        headers: {
            'Authorization': 'Bearer ' + password,
            'Content-Type': 'application/json'
        }
    });

    return true;
}

async function getLease(definitionIdVar: number, runIdVar: number, orgURLVar: string | undefined,
    projectNameVar : string | undefined, ownerIdVar : string | undefined,
    password: string | undefined): Promise<any> {

    let existingLease = await fetch(orgURLVar! + projectNameVar! +
        '/_apis/build/retention/leases?ownerId=' + ownerIdVar +'&definitionId=' + definitionIdVar +
        '&runId=' + runIdVar + '&api-version=6.0-preview.1', {
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            }
        }
    );
    return await existingLease.json();
}

async function cleanOldLeases(definitionIdVar: number, orgURLVar: string | undefined,
    projectNameVar: string | undefined, ownerIdVar: string | undefined,
    password: string | undefined, leaseIdVar : number, maxNumberLeasesVar : number) : Promise<boolean> {
    
    let existingLease = await fetch(orgURLVar! + projectNameVar! +
        '/_apis/build/retention/leases?ownerId=' + ownerIdVar + '&definitionId=' + definitionIdVar +
        '&api-version=6.0-preview.1', {
            method: 'get',
            headers: {
                'Authorization': 'Bearer ' + password,
                'Content-Type': 'application/json'
            }
        }
    );

    let leasesJSON = await existingLease.json() as GetLeaseResult;
    let numberLeases = Number(leasesJSON.count);
    let index = 0;

    while (numberLeases > maxNumberLeasesVar)
    {
        let leaseId = leasesJSON.value[index].leaseId;
        if (leaseId != leaseIdVar) {
            await deleteLeaseByLeaseID(leaseId, orgURLVar, projectNameVar, password);
        }

        index = index + 1;
        numberLeases = numberLeases - 1;
    }

    return true;
}

async function createLease(daysValidVar: number, definitionIdVar: number,
    protectPipelineVar: boolean, runIdVar: number, orgURLVar: string | undefined,
    projectNameVar: string | undefined, ownerIdVar: string | undefined,
    password: string | undefined): Promise<CreateLeaseResult> {
   
    let existingLeaseJson = await getLease(definitionIdVar, runIdVar,
        orgURLVar, projectNameVar, ownerIdVar, password);
    
    let queryLeases = existingLeaseJson as GetLeaseResult;
    
    if (Number(queryLeases.count) > 0)
    {
        return existingLeaseJson as CreateLeaseResult; 
    }
    
    const response = await fetch(orgURLVar! + projectNameVar! + '/_apis/build/retention/leases?api-version=6.0-preview.1', {
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
    
    const data = await response.json();
    return data as CreateLeaseResult; 
}

interface CreateLeaseResult {
    count: string;
    value: Array<LeaseResultValue>;
}

interface LeaseResultValue {
    leaseId: number;
    ownerId: string;
    runId: number;
    definitionId: number;
    createdOn: string;
    validUntil: string;
}

interface GetLeaseResult {
    count: string;
    value: Array<LeaseResultValue>;
}

run();
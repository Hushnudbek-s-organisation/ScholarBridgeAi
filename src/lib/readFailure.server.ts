import {randomUUID} from 'node:crypto';
import {readFailureDiagnostic} from './readFailure';

/** Server-only fixed diagnostic, using the existing safe E2E/operator channel.
 * Console stripping in production must not remove the correlation record. */
export function reportReadFailure(where:string,error:unknown){
 const diagnostic={requestId:randomUUID(),...readFailureDiagnostic(where,error)};
 process.stderr.write(`[journey-failure] ${JSON.stringify(diagnostic)}\n`);
 return diagnostic;
}

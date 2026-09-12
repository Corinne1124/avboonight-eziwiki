#!/usr/bin/env tsx

/**
 * Build-time payload validation script
 * This script validates the payload configuration against the JSON Schema
 * and exits with an error code if validation fails.
 */

import { isEntryPoint } from '../lib/build/entryPoint';
import { validatePayload } from '../lib/payload/validator';
import payload from '../payload/config';

/**
 * Validates the payload, printing what was found.
 *
 * Exported so that `check.ts` can run this and the link report in one process:
 * both read the same payload, and starting two `tsx` processes to read one file
 * twice costs several seconds before either has done anything.
 *
 * @returns True when the payload is valid
 */
export function checkPayload(): boolean {
  console.log('🔍 Validating payload configuration...\n');

  const validation = validatePayload(payload);

  if (!validation.valid) {
    console.error('❌ Payload validation failed:\n');
    validation.errors?.forEach((err) => {
      console.error(`  • ${err}`);
    });
    console.error('\nPlease fix the errors in payload/config.ts and try again.\n');
    return false;
  }

  console.log('✅ Payload validation passed!\n');
  return true;
}

// Importing this module must not check anything: Next compiles every `.ts`
// file in the project, and a module that exited the process when it was read
// would take the build with it.
if (isEntryPoint(import.meta.url)) {
  process.exit(checkPayload() ? 0 : 1);
}

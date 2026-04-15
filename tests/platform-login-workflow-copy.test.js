const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('background copy reflects the platform-login-first signup flow', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /Phase 1: Open platform login page/i
  );
  assert.match(
    backgroundSource,
    /Step 2: Opening platform login page/i
  );
  assert.match(
    backgroundSource,
    /reuseActiveTabOnCreate:\s*true/i
  );
  assert.match(
    backgroundSource,
    /clicking Continue, and requesting a one-time verification code/i
  );
  assert.doesNotMatch(
    backgroundSource,
    /Phase 1: Open official signup/i
  );
});

test('side panel workflow labels describe the platform login and continue flow', () => {
  const sidepanelHtml = readProjectFile(path.join('sidepanel', 'sidepanel.html'));

  assert.match(sidepanelHtml, />Open Platform Login</);
  assert.match(sidepanelHtml, />Fill Email \/ Continue</);
  assert.doesNotMatch(sidepanelHtml, />Open Signup</);
  assert.doesNotMatch(sidepanelHtml, />Fill Email \/ Password</);
});

test('step 2 ignores navigation-driven signup page disconnects and keeps waiting for completion', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /async function executeStep2\(state\) \{[\s\S]*try \{[\s\S]*await sendToContentScript\('signup-page', \{[\s\S]*\}\);[\s\S]*\} catch \(err\) \{[\s\S]*isMessageChannelClosedError\([\s\S]*isReceivingEndMissingError\([\s\S]*waiting for completion signal[\s\S]*throw err;[\s\S]*\}[\s\S]*\}/i
  );
});

test('step 2 has an auth-page-ready fallback when the completion signal is lost during navigation', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /async function waitForStep2CompletionSignalOrAuthPageReady\(\) \{/i
  );
  assert.match(
    backgroundSource,
    /Step 2: Signup page navigated before the step-2 response returned[\s\S]*await waitForStep2CompletionSignalOrAuthPageReady\(\);/i
  );
  assert.match(
    backgroundSource,
    /hasVisibleCredentialInput[\s\S]*notifyStepComplete\(2,\s*\{[\s\S]*recoveredAfterNavigation:\s*true[\s\S]*\}\)/i
  );
});

test('step 3 keeps waiting for completion when the signup auth page enters bfcache during navigation', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /async function executeStep3\(state\) \{[\s\S]*try \{[\s\S]*await sendToContentScript\('signup-page', \{[\s\S]*step:\s*3[\s\S]*\}\);[\s\S]*\} catch \(err\) \{[\s\S]*isMessageChannelClosedError\([\s\S]*isReceivingEndMissingError\([\s\S]*waitForStep3CompletionSignalOrRecoveredAuthState\(\);[\s\S]*throw err;[\s\S]*\}[\s\S]*\}/i
  );
  assert.match(
    backgroundSource,
    /async function waitForStep3CompletionSignalOrRecoveredAuthState\(\) \{/i
  );
  assert.match(
    backgroundSource,
    /hasVisibleVerificationInput[\s\S]*const payload = \{ recoveredAfterNavigation:\s*true \};[\s\S]*notifyStepComplete\(3,\s*payload\)/i
  );
  assert.match(
    backgroundSource,
    /const payload = \{[\s\S]*recoveredAfterNavigation:\s*true,[\s\S]*existingAccountLogin:\s*true[\s\S]*\};[\s\S]*Existing-account login password page is already visible after the navigation interrupt[\s\S]*notifyStepComplete\(3,\s*payload\)/i
  );
});

test('step 8 heartbeats retry the consent-page continue click when the auth page stalls on consent', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /async function retryStep8ConsentClickIfStillVisible\(/i
  );
  assert.match(
    backgroundSource,
    /shouldLogStep8RedirectHeartbeat\([\s\S]*await retryStep8ConsentClickIfStillVisible\(/i
  );
  assert.match(
    backgroundSource,
    /Consent page is still visible during heartbeat[\s\S]*retrying the "继续" click/i
  );
});

test('step 4 and step 5 skip signup-only work when step 3 already identified an existing account login flow', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /case 3:[\s\S]*existingAccountLogin/i
  );
  assert.match(
    backgroundSource,
    /async function executeStep4\(state\) \{[\s\S]*if \(state\.existingAccountLogin\)[\s\S]*Skipping inbox polling[\s\S]*notifyStepComplete\(4,\s*\{[\s\S]*skippedExistingAccountLogin:\s*true/i
  );
  assert.match(
    backgroundSource,
    /async function executeStep5\(state\) \{[\s\S]*if \(state\.existingAccountLogin\)[\s\S]*Skipping profile completion[\s\S]*notifyStepComplete\(5,\s*\{[\s\S]*skippedExistingAccountLogin:\s*true/i
  );
});

test('infinite auto run keeps per-run reset and log-round setup inside the retryable run catch', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /const runTargetText = autoRunInfinite \? `\$\{run\}\/∞` : `\$\{run\}\/\$\{totalRuns\}`;\r?\n\r?\n\s*try \{\r?\n\s*\/\/ Reset everything at the start of each run[\s\S]*await resetState\(\{ preserveLogHistory: true \}\);[\s\S]*await startNewLogRound\(`Run \$\{runTargetText\}`\);[\s\S]*await executeStepAndWait\(2,\s*2000\);/i
  );
});

test('auto run phase 2 uses a distinct email-source binding after the per-run setup block', () => {
  const backgroundSource = readProjectFile('background.js');

  assert.match(
    backgroundSource,
    /const currentState = await getState\(\);\r?\n\s*const currentEmailSource = getCurrentEmailSource\(currentState\);[\s\S]*getEmailSourceLabel\(currentEmailSource\)/i
  );
});

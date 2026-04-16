(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_STEP3_FLOW_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_STEP3_FLOW_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow) {
  throw new Error('OpenAI auth step 3 flow could not find the shared auth flow shell.');
}

async function step3_fillEmailPassword(payload) {
  const { email } = payload;
  if (!email) throw new Error('No email provided. Paste email in Side Panel first.');

  authFlow.throwIfAuthOperationTimedOut(3);
  await authFlow.waitForStep3SignupContext();
  authFlow.throwIfPlatformLoginEntryTimedOut(3);
  if (authFlow.isStep3AlreadyAdvancedPage(authFlow.getVisiblePageText(), location.href)) {
    log('Step 3: Signup credentials were already submitted before reinjection. Continuing from the verification/profile page.');
    reportComplete(3, { email });
    return;
  }

  const directPlatformLoginEntry = authFlow.isDirectPlatformLoginStep3Entry(location.href);
  const inlineCredentialChoice = !directPlatformLoginEntry
    ? authFlow.findStep3ImmediateCredentialChoice()
    : null;

  if (inlineCredentialChoice?.passwordInput) {
    let passwordInput = inlineCredentialChoice.passwordInput;
    if (authFlow.isSignupFlowUnexpectedlyOnLoginPasswordPage()) {
      const recoveredSignupPasswordInput = await authFlow.recoverStep3SignupPasswordInputFromLoginPasswordPage();
      if (recoveredSignupPasswordInput) {
        passwordInput = recoveredSignupPasswordInput;
      } else {
        log('Step 3: Signup flow fell back to the existing-account login password page without a visible signup entry. Preserving the current email/password and continuing with the login flow instead of requesting a signup code.', 'warn');
        reportComplete(3, { email, existingAccountLogin: true });
        return;
      }
    }

    log('Step 3: Password field is already visible on the current signup page. Skipping identifier refill and continuing with password submit...');
    const submissionStartUrl = await authFlow.submitStep3WithPassword(payload, passwordInput);
    await authFlow.waitForStep3CredentialSubmissionOutcome(submissionStartUrl);
    reportComplete(3, { email });
    return;
  }

  if (inlineCredentialChoice?.otpButton) {
    await humanPause(450, 1200);
    simulateClick(inlineCredentialChoice.otpButton);
    log('Step 3: One-time-code login is already visible on the current signup page. Continuing without refilling email.');
    reportComplete(3, { email, usesOneTimeCode: true });
    return;
  }

  log(`Step 3: Filling email: ${email}`);

  let emailInput = null;
  try {
    emailInput = await waitForElement(
      authFlow.CREDENTIAL_INPUT_SELECTOR,
      10000
    );
  } catch {
    if (await authFlow.handleAuthReturnHomeRecovery?.(3)) {
      throw new Error(authFlow.getAuthReturnHomeRecoveryErrorMessage(3));
    }
    authFlow.throwIfAuthOperationTimedOut(3);
    if (authFlow.isBlockingAuthFatalError(authFlow.getVisiblePageText())) {
      throw new Error('Auth fatal error page detected before the email input appeared.');
    }
    throw new Error('Could not find email input field on signup page. URL: ' + location.href);
  }

  await humanPause(500, 1400);
  fillInput(emailInput, email);
  log('Step 3: Email filled');
  authFlow.throwIfPlatformLoginEntryTimedOut(3);

  const postEmailCredentialChoice = authFlow.findStep3ImmediateCredentialChoice();
  if (postEmailCredentialChoice?.passwordInput) {
    let passwordInput = postEmailCredentialChoice.passwordInput;
    if (authFlow.isSignupFlowUnexpectedlyOnLoginPasswordPage()) {
      const recoveredSignupPasswordInput = await authFlow.recoverStep3SignupPasswordInputFromLoginPasswordPage();
      if (recoveredSignupPasswordInput) {
        passwordInput = recoveredSignupPasswordInput;
      } else {
        log('Step 3: Signup flow fell back to the existing-account login password page without a visible signup entry. Preserving the current email/password and continuing with the login flow instead of requesting a signup code.', 'warn');
        reportComplete(3, { email, existingAccountLogin: true });
        return;
      }
    }
    log('Step 3: Password field is already visible on the same page. Filling password before the first continue click...');
    const submissionStartUrl = await authFlow.submitStep3WithPassword(payload, passwordInput);
    await authFlow.waitForStep3CredentialSubmissionOutcome(submissionStartUrl);
    reportComplete(3, { email });
    return;
  }
  if (postEmailCredentialChoice?.otpButton) {
    await humanPause(450, 1200);
    simulateClick(postEmailCredentialChoice.otpButton);
    log('Step 3: Selected one-time-code login for registration.');
    reportComplete(3, { email, usesOneTimeCode: true });
    return;
  }

  log('Step 3: Submitting email and checking whether one-time-code login is available...');
  const emailSubmitBtn = document.querySelector('button[type="submit"]')
    || await waitForElementByText('button', /continue|next|submit|继续|下一步/i, 5000).catch(() => null);

  if (emailSubmitBtn) {
    await humanPause(400, 1100);
    simulateClick(emailSubmitBtn);
    log('Step 3: Submitted email, waiting for passwordless login or password field...');
    await sleep(2000);
    authFlow.throwIfPlatformLoginEntryTimedOut(3);
  }

  const passwordlessChoice = await authFlow.waitForPasswordlessOrPasswordField();
  authFlow.throwIfPlatformLoginEntryTimedOut(3);
  if (passwordlessChoice?.otpButton) {
    await humanPause(450, 1200);
    simulateClick(passwordlessChoice.otpButton);
    log('Step 3: Selected one-time-code login for registration.');
    reportComplete(3, { email, usesOneTimeCode: true });
    return;
  }

  let passwordInput = passwordlessChoice?.passwordInput || null;
  if (!passwordInput) {
    if (await authFlow.handleAuthReturnHomeRecovery?.(3)) {
      throw new Error(authFlow.getAuthReturnHomeRecoveryErrorMessage(3));
    }
    authFlow.throwIfAuthOperationTimedOut(3);
    if (authFlow.isBlockingAuthFatalError(authFlow.getVisiblePageText())) {
      throw new Error('Auth fatal error page detected before the password input appeared.');
    }
    throw new Error('Could not find passwordless-login button or password input after submitting email. URL: ' + location.href);
  }

  if (authFlow.isSignupFlowUnexpectedlyOnLoginPasswordPage()) {
    const recoveredSignupPasswordInput = await authFlow.recoverStep3SignupPasswordInputFromLoginPasswordPage();
    if (recoveredSignupPasswordInput) {
      passwordInput = recoveredSignupPasswordInput;
    } else {
      log('Step 3: Email submit landed on the existing-account login password page without a visible signup entry. Preserving the current email/password and continuing with the login flow instead of requesting a signup code.', 'warn');
      reportComplete(3, { email, existingAccountLogin: true });
      return;
    }
  }

  if (!payload.password) throw new Error('No password provided. Step 3 requires a generated password.');
  const submissionStartUrl = await authFlow.submitStep3WithPassword(payload, passwordInput);
  await authFlow.waitForStep3CredentialSubmissionOutcome(submissionStartUrl);
  reportComplete(3, { email });
}

Object.assign(authFlow, {
  step3_fillEmailPassword,
});
})();

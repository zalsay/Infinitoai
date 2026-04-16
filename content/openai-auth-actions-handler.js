(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_ACTIONS_HANDLER_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_ACTIONS_HANDLER_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow?.registerActionHandler) {
  throw new Error('OpenAI auth action handlers could not find the shared signup-page registry.');
}

if (!authFlow?.fillVerificationCode || !authFlow?.clickResendEmail || !authFlow?.getAuthPageState || !authFlow?.step8_findAndClick || !authFlow?.step8_trySubmit) {
  throw new Error('OpenAI auth action handlers are missing required implementations from signup-page.js.');
}

authFlow.registerActionHandler('FILL_CODE', async (message) => authFlow.fillVerificationCode(message.step, message.payload), {
  name: 'verification-code',
});
authFlow.registerActionHandler('CLICK_RESEND_EMAIL', async (message) => authFlow.clickResendEmail(message.step), {
  name: 'resend-email',
});
authFlow.registerActionHandler('CHECK_AUTH_PAGE_STATE', () => authFlow.getAuthPageState(), {
  name: 'auth-page-state',
});
authFlow.registerActionHandler('STEP8_FIND_AND_CLICK', async () => authFlow.step8_findAndClick(), {
  name: 'oauth-consent-click',
});
authFlow.registerActionHandler('STEP8_TRY_SUBMIT', async () => authFlow.step8_trySubmit(), {
  name: 'oauth-consent-submit',
});

if (!globalThis.__MULTIPAGE_UTILS_STATE?.readyReported && typeof reportReady === 'function') {
  globalThis.__MULTIPAGE_UTILS_STATE.readyReported = true;
  reportReady({
    registeredSteps: authFlow.getRegisteredStepMetadata?.() || [],
    registeredActions: authFlow.getRegisteredActionMetadata?.() || [],
  });
}
})();

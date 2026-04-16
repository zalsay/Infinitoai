(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_STEP3_HANDLER_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_STEP3_HANDLER_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow?.registerStepHandler || !authFlow?.step3_fillEmailPassword) {
  throw new Error('OpenAI auth flow step 3 handler could not find the shared signup-page registry.');
}

authFlow.registerStepHandler(3, authFlow.step3_fillEmailPassword, {
  name: 'signup-credentials',
});
})();

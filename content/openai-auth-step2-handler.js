(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_STEP2_HANDLER_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_STEP2_HANDLER_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow?.registerStepHandler || !authFlow?.step2_clickRegister) {
  throw new Error('OpenAI auth flow step 2 handler could not find the shared signup-page registry.');
}

authFlow.registerStepHandler(2, authFlow.step2_clickRegister, {
  name: 'platform-signup-entry',
});
})();

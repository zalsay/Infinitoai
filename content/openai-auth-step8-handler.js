(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_STEP8_HANDLER_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_STEP8_HANDLER_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow?.registerStepHandler || !authFlow?.step8_findAndClick) {
  throw new Error('OpenAI auth flow step 8 handler could not find the shared signup-page registry.');
}

authFlow.registerStepHandler(8, async () => authFlow.step8_findAndClick(), {
  name: 'oauth-consent',
});
})();

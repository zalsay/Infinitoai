(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_STEP6_HANDLER_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_STEP6_HANDLER_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow?.registerStepHandler || !authFlow?.step6_login) {
  throw new Error('OpenAI auth flow step 6 handler could not find the shared signup-page registry.');
}

authFlow.registerStepHandler(6, authFlow.step6_login, {
  name: 'oauth-login',
});
})();

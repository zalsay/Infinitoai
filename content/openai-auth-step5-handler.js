(function() {
if (window.__MULTIPAGE_OPENAI_AUTH_STEP5_HANDLER_LOADED) {
  return;
}
window.__MULTIPAGE_OPENAI_AUTH_STEP5_HANDLER_LOADED = true;

const authFlow = window.__MULTIPAGE_OPENAI_AUTH_FLOW__;
if (!authFlow?.registerStepHandler || !authFlow?.step5_fillNameBirthday) {
  throw new Error('OpenAI auth flow step 5 handler could not find the shared signup-page registry.');
}

authFlow.registerStepHandler(5, authFlow.step5_fillNameBirthday, {
  name: 'signup-profile',
});
})();

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadUtilsContext() {
  const sentMessages = [];
  const listeners = [];
  const context = {
    console: {
      log() {},
      warn() {},
      error() {},
    },
    location: { href: 'https://auth.openai.com/create-account' },
    document: {
      body: { innerText: '' },
      documentElement: {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
    chrome: {
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          },
        },
        sendMessage(message) {
          sentMessages.push(message);
        },
      },
    },
    MutationObserver: class {
      disconnect() {}
      observe() {}
    },
    Event: class {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
    MouseEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
    KeyboardEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
    InputEvent: class {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    },
    Date,
    setTimeout,
    clearTimeout,
  };

  context.window = context;
  context.top = context;
  context.__listeners = listeners;
  context.__sentMessages = sentMessages;

  const scriptPath = path.join(__dirname, '..', 'content', 'utils.js');
  const code = fs.readFileSync(scriptPath, 'utf8');
  vm.createContext(context);
  vm.runInContext(code, context, { filename: scriptPath });

  return context;
}

test('reportError emits step error without a duplicate LOG message', () => {
  const context = loadUtilsContext();
  context.__sentMessages.length = 0;

  context.reportError(7, 'Phone verification required');

  assert.deepEqual(
    context.__sentMessages.map((message) => message.type),
    ['STEP_ERROR']
  );
});

test('reportComplete returns the runtime delivery promise for navigation-sensitive steps', async () => {
  const context = loadUtilsContext();
  context.__sentMessages.length = 0;

  let resolveDelivery;
  const deliveryPromise = new Promise((resolve) => {
    resolveDelivery = resolve;
  });

  context.chrome.runtime.sendMessage = (message) => {
    context.__sentMessages.push(message);
    return deliveryPromise;
  };

  const reportPromise = context.reportComplete(2, { recovered: false });

  assert.equal(reportPromise, deliveryPromise);
  assert.deepEqual(
    context.__sentMessages.map((message) => message.type),
    ['LOG', 'STEP_COMPLETE']
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.__sentMessages.at(-1))),
    {
      type: 'STEP_COMPLETE',
      source: 'signup-page',
      step: 2,
      payload: { recovered: false },
      error: null,
    }
  );

  resolveDelivery({ ok: true });
  await reportPromise;
});

test('simulateClick prefers the element native click handler when available', () => {
  const context = loadUtilsContext();
  let nativeClickCalls = 0;
  let dispatchedClickCalls = 0;

  const button = {
    tagName: 'BUTTON',
    textContent: 'New Email',
    click() {
      nativeClickCalls += 1;
    },
    dispatchEvent(event) {
      if (event?.type === 'click') {
        dispatchedClickCalls += 1;
      }
      return true;
    },
  };

  context.simulateClick(button);

  assert.equal(nativeClickCalls, 1);
  assert.equal(dispatchedClickCalls, 0);
});

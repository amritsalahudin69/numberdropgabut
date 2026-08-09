import { MarbleDropApp } from './app/MarbleDropApp.js';

async function bootstrap() {
  const host = document.getElementById('app');
  if (!host) {
    console.error('Root host element #app not found');
    return;
  }

  const app = new MarbleDropApp();

  try {
    await app.init(host);

    if (typeof window !== 'undefined') {
      window.__MARBLEDROP_APP__ = {
        getState: () => app.getState(),
        getGameSnapshot: () => app.getGameSnapshot(),
        reset: () => app.reset(),
        destroy: () => app.destroy(),
      };
    }
  } catch (err) {
    console.error('MarbleDropApp initialization failed:', err);
    if (host) {
      host.innerHTML = `<div class="boot-failure-message">
        <h2>Boot Failure</h2>
        <p>${err.message || 'An unexpected initialization error occurred.'}</p>
      </div>`;
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    bootstrap();
  });
}

import '@affine/core/bootstrap/browser';

/**
 * the below code includes the custom fetch and xmlhttprequest implementation for ios webview.
 * should be included in the entry file of the app or webworker.
 */

/*
 * we override the browser's fetch function with our custom fetch function to
 * overcome the restrictions of cross-domain and third-party cookies in ios webview.
 *
 * the custom fetch function will convert the request to `affine-http://` or `affine-https://`
 * and send the request to the server.
 */
const rawFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = new URL(
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url,
    globalThis.location.origin
  ).href;

  if (url.startsWith('capacitor:')) {
    return rawFetch(input, init);
  }

  if (url.startsWith('http:')) {
    url = 'affine-http:' + url.slice(5);
  }

  if (url.startsWith('https:')) {
    url = 'affine-https:' + url.slice(6);
  }

  return rawFetch(url, input instanceof Request ? input : init);
};

const rawXMLHttpRequest = globalThis.XMLHttpRequest;
globalThis.XMLHttpRequest = class extends rawXMLHttpRequest {
  override open(
    method: string,
    url: string,
    async?: boolean,
    user?: string,
    password?: string
  ) {
    let normalizedUrl = new URL(url, globalThis.location.origin).href;

    if (normalizedUrl.startsWith('http:')) {
      url = 'affine-http:' + url.slice(5);
    }

    if (normalizedUrl.startsWith('https:')) {
      url = 'affine-https:' + url.slice(6);
    }

    (super.open as any)(method, url, async, user, password);
  }
};

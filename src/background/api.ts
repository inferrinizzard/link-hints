import type { InjectedConfig } from "../shared/messages";
import injected from "../worker/injected";

type ScriptDetails = {
  file?: string;
  allFrames?: boolean;
  runAt?: "document_end" | "document_idle" | "document_start";
};

export async function executeScript(
  tabId: number,
  details: ScriptDetails
): Promise<Array<unknown>> {
  if (BROWSER === "chrome") {
    const results = await chromeCall<Array<chrome.scripting.InjectionResult>>(
      (callback) => {
        chrome.scripting.executeScript(
          {
            target: makeChromeTarget(tabId, details.allFrames),
            ...(details.file === undefined ? {} : { files: [details.file] }),
            ...(details.runAt === "document_start"
              ? { injectImmediately: true }
              : {}),
          },
          callback
        );
      }
    );
    return results.map(({ result }) => result);
  }

  if (details.file === undefined) {
    throw new Error("Script file is required");
  }

  const results = await browser.scripting.executeScript({
    target: {
      tabId,
      ...(details.allFrames === undefined
        ? {}
        : { allFrames: details.allFrames }),
    },
    files: [details.file],
    ...(details.runAt === "document_start" ? { injectImmediately: true } : {}),
  });
  return results.map(({ result }) => result);
}

export async function executeMainWorldScript(
  tabId: number,
  frameId: number,
  config: InjectedConfig
): Promise<void> {
  if (BROWSER !== "chrome") {
    throw new Error("Main-world scripting is only supported in Chrome");
  }

  await chromeCall<Array<chrome.scripting.InjectionResult>>((callback) => {
    chrome.scripting.executeScript(
      {
        target: { tabId, frameIds: [frameId] },
        world: "MAIN",
        func: injected,
        args: [config],
      },
      callback
    );
  });
}

export async function insertCSS(
  tabId: number,
  css: string,
  origin: "AUTHOR" | "USER"
): Promise<void> {
  if (BROWSER === "chrome") {
    await chromeCall<undefined>((callback) => {
      chrome.scripting.insertCSS(
        {
          target: { tabId },
          css,
          origin,
        },
        () => {
          callback(undefined);
        }
      );
    });
    return;
  }

  await browser.scripting.insertCSS({
    target: { tabId },
    css,
    origin,
  });
}

export async function setActionBadgeBackgroundColor(
  color: string
): Promise<void> {
  if (BROWSER === "chrome") {
    await chromeCall<undefined>((callback) => {
      chrome.action.setBadgeBackgroundColor({ color }, () => {
        callback(undefined);
      });
    });
    return;
  }
  await browser.action.setBadgeBackgroundColor({ color });
}

export async function setActionIcon(
  path: Record<string, string>,
  tabId: number
): Promise<void> {
  if (BROWSER === "chrome") {
    await chromeCall<undefined>((callback) => {
      chrome.action.setIcon({ path, tabId }, () => {
        callback(undefined);
      });
    });
    return;
  }
  await browser.action.setIcon({ path, tabId });
}

export async function setActionBadgeText(
  text: string,
  tabId: number
): Promise<void> {
  if (BROWSER === "chrome") {
    await chromeCall<undefined>((callback) => {
      chrome.action.setBadgeText({ text, tabId }, () => {
        callback(undefined);
      });
    });
    return;
  }
  await browser.action.setBadgeText({ text, tabId });
}

function makeChromeTarget(
  tabId: number,
  allFrames: boolean | undefined
): chrome.scripting.InjectionTarget {
  return {
    tabId,
    ...(allFrames === undefined ? {} : { allFrames }),
  };
}

async function chromeCall<T>(
  run: (callback: (result: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    run((result) => {
      const error = chrome.runtime.lastError;
      if (error !== undefined) {
        reject(new Error(error.message ?? "Chrome extension API call failed"));
      } else {
        resolve(result);
      }
    });
  });
}

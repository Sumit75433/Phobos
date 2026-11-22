let confirmedThisProcess = false;

export function chatgptSignInAvailable(): boolean {
  return typeof window.phobosTransport?.chatgptAccount === "function";
}

export function chatgptSignInCompleted(): boolean {
  return confirmedThisProcess;
}

export function recordChatgptSignIn(signedIn = true): void {
  confirmedThisProcess = signedIn;
}

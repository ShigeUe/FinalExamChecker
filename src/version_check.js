function version2num(ver) {
  const vers = ver.split('.');
  return Number(vers[0]) * 100 + Number(vers[1]);
}

export async function checkAppVersion() {
  console.log('The version is checked.');

  try {
    const resp = await fetch('https://raw.githubusercontent.com/ShigeUe/FinalExamChecker/refs/heads/main/manifest.json');
    const data = await resp.json();
    const local = chrome.runtime.getManifest();

    return (version2num(local.version) < version2num(data.version));
  }
  catch (e) {
    return false;
  }
}


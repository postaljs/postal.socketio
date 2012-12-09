postal.instanceId = "browser-client-123";

postal.addWireTap(function(d, e) {
  console.log("ID: " + postal.instanceId + " " + JSON.stringify(e, null, 4));
});

window.__socket = io.connect(window.location.origin);

postal.fedx.signalReady();
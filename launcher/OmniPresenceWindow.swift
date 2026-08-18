import Cocoa
import WebKit

/// Minimal native shell: starts the local Vite server and shows it in an app window.
final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
  var window: NSWindow!
  var webView: WKWebView!
  var serverProcess: Process?
  var workerProcess: Process?
  var pollTimer: Timer?
  var statusLabel: NSTextField!

  let url = URL(string: "http://127.0.0.1:3000/")!
  let frontendPath: String
  let workerPath: String
  let projectRoot: String

  override init() {
    func looksLikeProject(_ root: String) -> Bool {
      FileManager.default.fileExists(
        atPath: (root as NSString).appendingPathComponent("frontend/package.json")
      )
    }

    var resolved = ""

    if let env = ProcessInfo.processInfo.environment["OMNIPRESENCE_ROOT"], looksLikeProject(env) {
      resolved = env
    }

    // Desktop / relocated copies bake the absolute path into Info.plist
    if resolved.isEmpty,
       let plistRoot = Bundle.main.object(forInfoDictionaryKey: "OmniPresenceProjectRoot") as? String,
       looksLikeProject(plistRoot) {
      resolved = plistRoot
    }

    // App living inside the repo: …/repo/OmniPresence.app/Contents/MacOS
    if resolved.isEmpty, let exeURL = Bundle.main.executableURL {
      let candidate = exeURL
        .deletingLastPathComponent() // MacOS
        .deletingLastPathComponent() // Contents
        .deletingLastPathComponent() // OmniPresence.app
        .deletingLastPathComponent() // repo root
        .path
      if looksLikeProject(candidate) {
        resolved = candidate
      }
    }

    if resolved.isEmpty {
      resolved = NSString(string: "~/glance-schedule-go").expandingTildeInPath
    }

    self.projectRoot = resolved
    self.frontendPath = (resolved as NSString).appendingPathComponent("frontend")
    self.workerPath = (resolved as NSString).appendingPathComponent("worker")
    super.init()
  }

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    buildWindow()
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)

    startWorkerIfNeeded()

    if isPortOpen(3000) {
      loadApp()
    } else {
      showStatus("Starting OmniPresence…")
      startServer()
      beginPolling()
    }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

  func applicationWillTerminate(_ notification: Notification) {
    pollTimer?.invalidate()
    stopServer()
    stopWorker()
  }

  // MARK: - UI

  func buildWindow() {
    let rect = NSRect(x: 0, y: 0, width: 1280, height: 840)
    window = NSWindow(
      contentRect: rect,
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered,
      defer: false
    )
    window.title = "OmniPresence"
    window.center()
    window.minSize = NSSize(width: 900, height: 600)
    window.setFrameAutosaveName("OmniPresenceMain")
    window.isReleasedWhenClosed = false

    let config = WKWebViewConfiguration()
    // Persistent store so localStorage survives quit/relaunch (not ephemeral).
    config.websiteDataStore = .default()
    config.preferences.setValue(true, forKey: "developerExtrasEnabled")
    if #available(macOS 11.0, *) {
      config.defaultWebpagePreferences.allowsContentJavaScript = true
    }
    webView = WKWebView(frame: rect, configuration: config)
    webView.navigationDelegate = self
    webView.allowsBackForwardNavigationGestures = true
    webView.setValue(false, forKey: "drawsBackground")

    statusLabel = NSTextField(labelWithString: "Loading…")
    statusLabel.alignment = .center
    statusLabel.font = NSFont.systemFont(ofSize: 15, weight: .medium)
    statusLabel.textColor = .secondaryLabelColor
    statusLabel.translatesAutoresizingMaskIntoConstraints = false

    let container = NSView(frame: rect)
    container.wantsLayer = true
    container.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
    webView.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(webView)
    container.addSubview(statusLabel)

    NSLayoutConstraint.activate([
      webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
      webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
      webView.topAnchor.constraint(equalTo: container.topAnchor),
      webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
      statusLabel.centerXAnchor.constraint(equalTo: container.centerXAnchor),
      statusLabel.centerYAnchor.constraint(equalTo: container.centerYAnchor),
    ])

    window.contentView = container
  }

  func showStatus(_ text: String) {
    DispatchQueue.main.async {
      self.statusLabel.stringValue = text
      self.statusLabel.isHidden = false
      self.webView.isHidden = true
    }
  }

  func loadApp() {
    DispatchQueue.main.async {
      self.statusLabel.isHidden = true
      self.webView.isHidden = false
      self.webView.load(URLRequest(url: self.url))
      self.window.title = "OmniPresence"
    }
  }

  // MARK: - Server

  func isPortOpen(_ port: Int) -> Bool {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/sbin/lsof")
    task.arguments = ["-nP", "-iTCP:\(port)", "-sTCP:LISTEN"]
    task.standardOutput = FileHandle.nullDevice
    task.standardError = FileHandle.nullDevice
    do {
      try task.run()
      task.waitUntilExit()
      return task.terminationStatus == 0
    } catch {
      return false
    }
  }

  func startWorkerIfNeeded() {
    guard FileManager.default.fileExists(atPath: (workerPath as NSString).appendingPathComponent("package.json")) else {
      return
    }
    if isPortOpen(8787) { return }

    let modules = (workerPath as NSString).appendingPathComponent("node_modules")
    if !FileManager.default.fileExists(atPath: modules) {
      let install = Process()
      install.currentDirectoryURL = URL(fileURLWithPath: workerPath)
      install.executableURL = URL(fileURLWithPath: "/bin/bash")
      install.arguments = ["-lc", "npm install"]
      install.environment = ProcessInfo.processInfo.environment
      try? install.run()
      install.waitUntilExit()
    }

    let process = Process()
    process.currentDirectoryURL = URL(fileURLWithPath: workerPath)
    process.executableURL = URL(fileURLWithPath: "/bin/bash")
    process.arguments = ["-lc", "npm run init-db && npm start"]
    process.environment = ProcessInfo.processInfo.environment
    let logPath = "/tmp/omnipresence-worker.log"
    FileManager.default.createFile(atPath: logPath, contents: nil)
    if let log = FileHandle(forWritingAtPath: logPath) {
      process.standardOutput = log
      process.standardError = log
    }
    do {
      try process.run()
      workerProcess = process
    } catch {
      /* UI still works offline; Overview shows worker Attention */
    }
  }

  func stopWorker() {
    if let process = workerProcess, process.isRunning {
      process.terminate()
    }
    workerProcess = nil
    killPort(8787)
  }

  func startServer() {
    guard FileManager.default.fileExists(atPath: (frontendPath as NSString).appendingPathComponent("package.json")) else {
      showStatus("Could not find app at:\n\(frontendPath)")
      return
    }

    // Ensure deps once
    let modules = (frontendPath as NSString).appendingPathComponent("node_modules")
    if !FileManager.default.fileExists(atPath: modules) {
      showStatus("Installing dependencies (first run)…")
      let install = Process()
      install.currentDirectoryURL = URL(fileURLWithPath: frontendPath)
      install.executableURL = URL(fileURLWithPath: "/bin/bash")
      install.arguments = ["-lc", "npm install"]
      install.environment = ProcessInfo.processInfo.environment
      do {
        try install.run()
        install.waitUntilExit()
      } catch {
        showStatus("npm install failed: \(error.localizedDescription)")
        return
      }
    }

    showStatus("Starting local server…")
    let process = Process()
    process.currentDirectoryURL = URL(fileURLWithPath: frontendPath)
    process.executableURL = URL(fileURLWithPath: "/bin/bash")
    // Use login shell so nvm/fnm/node paths resolve like Terminal
    process.arguments = ["-lc", "unset DATABASE_URL; npm run dev"]
    var env = ProcessInfo.processInfo.environment
    env["DATABASE_URL"] = nil
    process.environment = env

    let logPath = "/tmp/omnipresence-dev.log"
    FileManager.default.createFile(atPath: logPath, contents: nil)
    if let log = FileHandle(forWritingAtPath: logPath) {
      process.standardOutput = log
      process.standardError = log
    }

    process.terminationHandler = { [weak self] proc in
      DispatchQueue.main.async {
        if proc.terminationStatus != 0 && self?.window.isVisible == true {
          self?.showStatus("Server stopped (code \(proc.terminationStatus)). See /tmp/omnipresence-dev.log")
        }
      }
    }

    do {
      try process.run()
      serverProcess = process
    } catch {
      showStatus("Failed to start server: \(error.localizedDescription)")
    }
  }

  func stopServer() {
    guard let process = serverProcess, process.isRunning else {
      killPort(3000)
      return
    }
    process.terminate()
    DispatchQueue.global().asyncAfter(deadline: .now() + 0.4) {
      self.killPort(3000)
    }
    serverProcess = nil
  }

  func killPort(_ port: Int) {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/bin/bash")
    task.arguments = [
      "-lc",
      "PIDS=$(lsof -tiTCP:\(port) -sTCP:LISTEN 2>/dev/null); [ -n \"$PIDS\" ] && kill $PIDS 2>/dev/null; sleep 0.2; PIDS=$(lsof -tiTCP:\(port) -sTCP:LISTEN 2>/dev/null); [ -n \"$PIDS\" ] && kill -9 $PIDS 2>/dev/null; true",
    ]
    try? task.run()
    task.waitUntilExit()
  }

  func beginPolling() {
    var attempts = 0
    pollTimer = Timer.scheduledTimer(withTimeInterval: 0.4, repeats: true) { [weak self] timer in
      guard let self else { timer.invalidate(); return }
      attempts += 1
      if self.isPortOpen(3000) {
        timer.invalidate()
        self.pollTimer = nil
        self.loadApp()
        return
      }
      if attempts > 150 { // ~60s
        timer.invalidate()
        self.pollTimer = nil
        self.showStatus("Server did not start. Check /tmp/omnipresence-dev.log")
      } else if attempts % 5 == 0 {
        self.showStatus("Starting local server… (\(attempts / 2)s)")
      }
    }
  }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()

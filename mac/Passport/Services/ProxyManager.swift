import Foundation

enum ProxyError: LocalizedError {
    case noNetworkService
    case commandFailed(String)

    var errorDescription: String? {
        switch self {
        case .noNetworkService:
            return "Could not find an active network service (Wi-Fi / Ethernet)."
        case .commandFailed(let detail):
            return detail
        }
    }
}

/// Sets macOS system proxy via `/usr/sbin/networksetup`.
/// This routes Safari, Chrome, and other apps through the selected country.
final class ProxyManager {
    func apply(config: ProxyConfig) throws {
        let service = try activeNetworkService()
        let host = config.host
        let port = String(config.port)
        let proto = config.`protocol`.lowercased()

        // Clear the other mode first so we don't stack proxies
        try clear(on: service)

        if proto == "socks5" || proto == "socks" {
            try runNetworkSetup(["-setsocksfirewallproxy", service, host, port])
            try runNetworkSetup(["-setsocksfirewallproxystate", service, "on"])
        } else {
            try runNetworkSetup(["-setwebproxy", service, host, port])
            try runNetworkSetup(["-setsecurewebproxy", service, host, port])
            try runNetworkSetup(["-setwebproxystate", service, "on"])
            try runNetworkSetup(["-setsecurewebproxystate", service, "on"])
        }
    }

    func clear() throws {
        try clear(on: try activeNetworkService())
    }

    private func clear(on service: String) throws {
        try? runNetworkSetup(["-setsocksfirewallproxystate", service, "off"])
        try? runNetworkSetup(["-setwebproxystate", service, "off"])
        try? runNetworkSetup(["-setsecurewebproxystate", service, "off"])
        try? runNetworkSetup(["-setproxybypassdomains", service, "localhost", "127.0.0.1", "*.local"])
    }

    private func activeNetworkService() throws -> String {
        // Prefer the service that has the default route hardware port
        let hardware = try runCapture("/usr/sbin/networksetup", ["-listnetworkserviceorder"])
        // Lines look like: (1) Wi-Fi\n(Hardware Port: Wi-Fi, Device: en0)
        let services = try runCapture("/usr/sbin/networksetup", ["-listallnetworkservices"])
            .split(separator: "\n")
            .map(String.init)
            .filter { !$0.hasPrefix("An asterisk") && !$0.isEmpty }

        // Prefer Wi-Fi, then Ethernet, then first listed
        let preferred = ["Wi-Fi", "WiFi", "Ethernet", "USB 10/100/1000 LAN"]
        for name in preferred where services.contains(name) {
            return name
        }

        // If hardware order mentions a device that's up, use that service name
        for service in services {
            if hardware.contains(service) { return service }
        }

        guard let first = services.first else { throw ProxyError.noNetworkService }
        return first
    }

    private func runNetworkSetup(_ args: [String]) throws {
        _ = try runCapture("/usr/sbin/networksetup", args)
    }

    @discardableResult
    private func runCapture(_ launchPath: String, _ arguments: [String]) throws -> String {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: launchPath)
        process.arguments = arguments

        let out = Pipe()
        let err = Pipe()
        process.standardOutput = out
        process.standardError = err

        try process.run()
        process.waitUntilExit()

        let stdout = String(data: out.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        let stderr = String(data: err.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""

        if process.terminationStatus != 0 {
            let detail = stderr.isEmpty ? stdout : stderr
            throw ProxyError.commandFailed(detail.trimmingCharacters(in: .whitespacesAndNewlines))
        }
        return stdout
    }
}

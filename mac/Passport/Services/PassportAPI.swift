import Foundation

enum PassportAPIError: LocalizedError {
    case badURL
    case http(Int)
    case message(String)
    case missingMembership

    var errorDescription: String? {
        switch self {
        case .badURL: return "Invalid API URL"
        case .http(let code): return "Server error (\(code))"
        case .message(let text): return text
        case .missingMembership: return "Add your Whop membership ID in Settings (mem_…)."
        }
    }
}

final class PassportAPI {
    var baseURL: String
    var membershipId: String?

    static let defaultBaseURL = "https://git-hub-publisher.replit.app/api"

    init(
        baseURL: String = PassportAPI.defaultBaseURL,
        membershipId: String? = nil
    ) {
        self.baseURL = baseURL
        self.membershipId = membershipId
    }

    func fetchCountries() async throws -> [Country] {
        var request = URLRequest(url: try makeURL("proxy/countries"))
        if let membershipId, !membershipId.isEmpty {
            request.setValue("Bearer \(membershipId)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response)
        struct Payload: Codable { let countries: [Country] }
        return try JSONDecoder().decode(Payload.self, from: data).countries
    }

    func fetchProxyConfig(countryCode: String) async throws -> ProxyConfig {
        guard let membershipId, !membershipId.isEmpty else {
            throw PassportAPIError.missingMembership
        }
        var request = URLRequest(url: try makeURL("proxy/config/\(countryCode)"))
        request.setValue("Bearer \(membershipId)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response)
        return try JSONDecoder().decode(ProxyConfig.self, from: data)
    }

    func translate(texts: [String], targetLanguage: String) async throws -> [String] {
        let url = try makeURL("translate")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "texts": texts,
            "targetLanguage": targetLanguage,
        ])
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response)
        struct Payload: Codable { let translations: [String] }
        return try JSONDecoder().decode(Payload.self, from: data).translations
    }

    private func makeURL(_ path: String) throws -> URL {
        let trimmed = baseURL.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(trimmed)/\(path)") else { throw PassportAPIError.badURL }
        return url
    }

    private func validate(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            throw PassportAPIError.http(http.statusCode)
        }
    }
}

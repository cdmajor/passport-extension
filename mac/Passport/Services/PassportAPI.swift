import Foundation

enum PassportAPIError: LocalizedError {
    case badURL
    case http(Int)
    case message(String)

    var errorDescription: String? {
        switch self {
        case .badURL: return "Invalid API URL"
        case .http(let code): return "Server error (\(code))"
        case .message(let text): return text
        }
    }
}

final class PassportAPI {
    var baseURL: String

    init(baseURL: String = "http://localhost:3000/api") {
        self.baseURL = baseURL
    }

    func fetchCountries() async throws -> [Country] {
        let url = try makeURL("proxy/countries")
        let (data, response) = try await URLSession.shared.data(from: url)
        try validate(response)
        struct Payload: Codable { let countries: [Country] }
        return try JSONDecoder().decode(Payload.self, from: data).countries
    }

    func fetchProxyConfig(countryCode: String) async throws -> ProxyConfig {
        let url = try makeURL("proxy/config/\(countryCode)")
        let (data, response) = try await URLSession.shared.data(from: url)
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

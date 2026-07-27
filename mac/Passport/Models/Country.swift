import Foundation

struct Country: Identifiable, Hashable, Codable {
    var id: String { code }
    let code: String
    let name: String
    let flagEmoji: String

    static let defaults: [Country] = [
        .init(code: "US", name: "United States", flagEmoji: "🇺🇸"),
        .init(code: "GB", name: "United Kingdom", flagEmoji: "🇬🇧"),
        .init(code: "CA", name: "Canada", flagEmoji: "🇨🇦"),
        .init(code: "AU", name: "Australia", flagEmoji: "🇦🇺"),
        .init(code: "DE", name: "Germany", flagEmoji: "🇩🇪"),
        .init(code: "FR", name: "France", flagEmoji: "🇫🇷"),
        .init(code: "JP", name: "Japan", flagEmoji: "🇯🇵"),
        .init(code: "KR", name: "South Korea", flagEmoji: "🇰🇷"),
        .init(code: "BR", name: "Brazil", flagEmoji: "🇧🇷"),
        .init(code: "MX", name: "Mexico", flagEmoji: "🇲🇽"),
        .init(code: "IN", name: "India", flagEmoji: "🇮🇳"),
        .init(code: "SG", name: "Singapore", flagEmoji: "🇸🇬"),
        .init(code: "NL", name: "Netherlands", flagEmoji: "🇳🇱"),
        .init(code: "ZA", name: "South Africa", flagEmoji: "🇿🇦"),
    ]
}

struct ProxyConfig: Codable {
    let host: String
    let port: Int
    let `protocol`: String
}
